"""SUMO SimulationAdapter (Section 20).

SUMO → PositionEvent → same telemetry endpoint → same map matcher →
same traffic engine → same routing → same QPSO → same frontend.

SUMO telemetry is labelled source="sumo" and mode="SIMULATION" everywhere.
When the SUMO binary is unavailable, a deterministic route-based generator
rehearses the same pipeline so the full system can be exercised end-to-end in
SIMULATION mode — it is clearly marked and never enabled in live mode.
"""
import asyncio
import random
import threading
import time
from datetime import datetime, timedelta, timezone
from typing import Dict, List, Optional

from app.core.config import settings
from app.core.logging import logger


class SumoSimulationAdapter:
    """Runs SUMO (or deterministic fallback) and feeds PositionEvents into the
    shared pipeline. Runs ONLY when DATA_MODE=simulation."""

    def __init__(self):
        self._task: Optional[asyncio.Task] = None
        self._running = False
        self._connected = False
        self._vehicle_count = 0
        self._sim_time_s = 0.0
        self._error: Optional[str] = None
        self._mode: str = "OFFLINE"   # OFFLINE | CONNECTING | RUNNING | ERROR
        self._traci = None
        self._lock = threading.Lock()

    # ---------------------------------------------------------------- status
    def status(self) -> dict:
        return {
            "running": self._running,
            "connected": self._connected,
            "vehicle_count": self._vehicle_count,
            "sim_time_s": round(self._sim_time_s, 1),
            "state": self._mode,
            "error": self._error,
            "data_mode": settings.DATA_MODE,
        }

    # ------------------------------------------------------------ lifecycle
    async def start(self, num_vehicles: int = 20) -> dict:
        if settings.DATA_MODE != "simulation":
            return {"ok": False, "error": "SUMO adapter may only run in DATA_MODE=simulation"}
        if self._running:
            return {"ok": True, "already_running": True}

        self._mode = "CONNECTING"
        self._error = None

        # Try TraCI first (real SUMO)
        try:
            import traci  # noqa: F401
            self._traci = traci
        except ImportError:
            self._traci = None

        if self._traci is not None and settings.SUMO_CONFIG_FILE:
            return await self._start_traci(num_vehicles)

        # Deterministic fallback generator (no SUMO binary installed)
        logger.info("SUMO binary/TraCI unavailable — using deterministic simulation generator (SIMULATION mode).")
        self._running = True
        self._connected = True
        self._mode = "RUNNING"
        self._sim_time_s = 0.0
        self._num_vehicles = max(1, min(num_vehicles, settings.SUMO_MAX_VEHICLES))
        self._task = asyncio.create_task(self._fallback_loop())
        return {"ok": True, "engine": "deterministic_generator"}

    async def _start_traci(self, num_vehicles: int) -> dict:
        try:
            traci = self._traci
            traci.start([settings.SUMO_BINARY,
                         "-c", settings.SUMO_CONFIG_FILE,
                         "--step-length", str(settings.SUMO_STEP_LENGTH_S)])
            self._running = True
            self._connected = True
            self._mode = "RUNNING"
            self._num_vehicles = num_vehicles
            self._task = asyncio.create_task(self._traci_loop())
            logger.info("SUMO started via TraCI with config %s", settings.SUMO_CONFIG_FILE)
            return {"ok": True, "engine": "sumo_traci"}
        except Exception as exc:
            self._mode = "ERROR"
            self._error = str(exc)
            logger.error("SUMO TraCI start failed: %s", exc)
            return {"ok": False, "error": str(exc)}

    async def stop(self) -> dict:
        self._running = False
        self._connected = False
        self._mode = "OFFLINE"
        self._vehicle_count = 0
        if self._task:
            self._task.cancel()
            self._task = None
        if self._traci is not None:
            try:
                self._traci.close()
            except Exception:
                pass
        logger.info("SUMO adapter stopped")
        return {"ok": True}

    # ---------------------------------------------------------------- loops
    async def _traci_loop(self) -> None:
        """Real SUMO: read vehicle positions each step → PositionEvents."""
        traci = self._traci
        step = 0
        while self._running:
            try:
                await asyncio.to_thread(traci.simulationStep)
                step += 1
                self._sim_time_s = traci.simulation.getTime()
                veh_ids = list(traci.vehicle.getIDList())
                self._vehicle_count = len(veh_ids)

                from app.telemetry.models import PositionEvent, TelemetrySource
                from app.telemetry.service import telemetry_service

                # Throttle: emit each vehicle's position every SUMO_TELEMETRY_INTERVAL_S
                events = []
                for vid in veh_ids[: settings.SUMO_MAX_VEHICLES]:
                    try:
                        pos = traci.vehicle.getPosition(vid)          # x,y metres (SUMO net coords)
                        lon, lat = traci.convertXY2LonLat(pos[0], pos[1])
                        speed_ms = traci.vehicle.getSpeed(vid)
                        heading = traci.vehicle.getAngle(vid)
                        events.append(PositionEvent(
                            vehicle_id=f"SUMO.{vid}",
                            timestamp=datetime.now(timezone.utc),
                            latitude=float(lat),
                            longitude=float(lon),
                            speed_kmh=round(float(speed_ms) * 3.6, 1),
                            heading_deg=float(heading),
                            source=TelemetrySource.SUMO,
                        ))
                    except Exception:
                        continue

                for ev in events:
                    try:
                        await telemetry_service.ingest(ev)
                    except Exception:
                        continue

                if step % 20 == 0:
                    logger.info("SUMO step=%d sim_time=%.0fs vehicles=%d", step, self._sim_time_s, self._vehicle_count)
                await asyncio.sleep(settings.SUMO_TELEMETRY_INTERVAL_S)
            except asyncio.CancelledError:
                break
            except Exception as exc:
                self._error = str(exc)
                self._mode = "ERROR"
                logger.error("SUMO TraCI loop error: %s", exc)
                break

    async def _fallback_loop(self) -> None:
        """Deterministic route-based generator through the SAME ingestion API.

        Vehicles follow straight-line paths between random OSM-adjacent points
        with plausible speeds; ingestion validation applies identically.
        Clearly marked source=sumo so nothing downstream can mistake it for
        live GPS."""
        rng = random.Random(42)  # deterministic seed — reproducible SIMULATION runs

        from app.network.map_matching import get_map_matcher
        matcher = get_map_matcher()
        ok = matcher.ensure_graph()
        if not ok:
            self._mode = "ERROR"
            self._error = "OSM network unavailable for simulation"
            self._running = False
            return

        # Pick deterministic start/end points from indexed edges
        edges = list(matcher._edges)
        if not edges:
            self._running = False
            self._mode = "ERROR"
            self._error = "No OSM edges indexed"
            return

        vehicles = []
        for i in range(self._num_vehicles):
            e = edges[rng.randrange(len(edges))]
            dest_edge = edges[rng.randrange(len(edges))]
            vehicles.append({
                "code": f"SUMO.SIM{i:03d}",
                "lat": e.lat_u,
                "lng": e.lng_u,
                "dest_lat": dest_edge.lat_v,
                "dest_lng": dest_edge.lng_v,
                "speed_kmh": rng.uniform(18.0, 48.0),
                "bearing": rng.uniform(0, 360),
            })

        from app.telemetry.models import PositionEvent, TelemetrySource
        from app.telemetry.service import telemetry_service

        step = 0
        while self._running:
            step += 1
            self._sim_time_s += settings.SUMO_STEP_LENGTH_S
            active = 0
            events: List[PositionEvent] = []
            for v in vehicles:
                # Move toward destination at plausible speed (deterministic)
                dlat = v["dest_lat"] - v["lat"]
                dlng = v["dest_lng"] - v["lng"]
                dist_deg = (dlat ** 2 + dlng ** 2) ** 0.5
                if dist_deg < 1e-5:
                    # respawn at a new edge (continuous simulation)
                    e = edges[rng.randrange(len(edges))]
                    v["lat"], v["lng"] = e.lat_u, e.lng_u
                    dest_edge = edges[rng.randrange(len(edges))]
                    v["dest_lat"], v["dest_lng"] = dest_edge.lat_v, dest_edge.lng_v
                    continue
                active += 1
                step_m = v["speed_kmh"] / 3.6 * settings.SUMO_STEP_LENGTH_S
                deg_per_m = 1.0 / 111320.0
                frac = min(1.0, (step_m * deg_per_m) / max(dist_deg, 1e-9))
                v["lat"] += dlat * frac
                v["lng"] += dlng * frac
                events.append(PositionEvent(
                    vehicle_id=v["code"],
                    timestamp=datetime.now(timezone.utc),
                    latitude=round(v["lat"], 6),
                    longitude=round(v["lng"], 6),
                    speed_kmh=round(v["speed_kmh"], 1),
                    heading_deg=round((math.degrees(math.atan2(dlng, dlat)) % 360.0), 1) if (dlat or dlng) else None,
                    accuracy_m=round(rng.uniform(4.0, 12.0), 1),
                    source=TelemetrySource.SUMO,
                ))
            self._vehicle_count = active

            for ev in events:
                try:
                    await telemetry_service.ingest(ev)
                except Exception:
                    pass  # rejected fixes (jumps etc.) simply don't enter the pipeline

            if step % 30 == 0:
                logger.info("SIM generator step=%d sim_time=%.0fs vehicles=%d",
                            step, self._sim_time_s, self._vehicle_count)
            await asyncio.sleep(settings.SUMO_TELEMETRY_INTERVAL_S)

    @property
    def vehicle_count(self) -> int:
        return self._vehicle_count


import math  # noqa: E402  (used in fallback loop)

sumo_adapter = SumoSimulationAdapter()
