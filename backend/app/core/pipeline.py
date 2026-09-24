"""Pipeline orchestrator.

Owns the event-driven flow from telemetry ingestion to route updates:
  PositionEvent → validate → store → map-match → vehicle state
    → traffic observation → [batch] traffic recompute → dynamic graph update
    → incident engine → QPSO + rerouting evaluation → route_update broadcast

QPSO is NOT run per GPS packet: evaluation is event-driven (batched traffic
cycles + reroute threshold gates) to keep ingestion unblocked (Section 24).
"""
import asyncio
import time
from datetime import datetime, timezone
from typing import Dict, Optional

from app.core.config import settings
from app.core.logging import logger


class PipelineOrchestrator:
    def __init__(self):
        self._workers: list = []
        self._running = False
        self._last_traffic_cycle = 0.0
        self._last_qpso_cycle = 0.0
        self._vehicle_last_seen: Dict[str, float] = {}
        self._optimization_runs = 0

    # ------------------------------------------------------------------ wire
    async def handle_position_update(self, update) -> None:
        """Called by the telemetry service after a position is accepted."""
        from app.telemetry.service import telemetry_service
        from app.realtime.manager import realtime_manager

        code = update.vehicle_code
        self._vehicle_last_seen[code] = time.time()

        # Publish vehicle_position realtime event
        try:
            await realtime_manager.broadcast(update.published_event or {
                "type": "vehicle_position",
                "vehicle_id": code,
                "lat": update.latitude,
                "lng": update.longitude,
            })
        except Exception as exc:
            logger.warning("vehicle_position broadcast failed: %s", exc)

    # ------------------------------------------------------- traffic cycle
    async def run_traffic_cycle(self) -> dict:
        """Batched traffic recompute → graph update → incident evaluation."""
        from app.traffic.engine import traffic_engine
        from app.network.map_matching import osm_map_matcher
        from app.routing.dynamic_graph import dynamic_routing_graph
        from app.incidents.engine import incident_engine
        from app.realtime.manager import realtime_manager

        traffic_engine.maybe_refresh_external()
        changed = traffic_engine.recompute()

        # register newly matched edges with the traffic engine metadata
        matcher = osm_map_matcher
        if matcher._edges:
            for state in changed:
                edge = matcher.get_edge(state.edge_id)
                if edge is not None:
                    traffic_engine.register_edge(
                        edge_id=edge.edge_id,
                        network_id=matcher.network_id,
                        free_flow_kmh=edge.speed_kph,
                        length_m=edge.length_m,
                        lat=edge.lat_u,
                        lng=edge.lng_u,
                    )

        # incremental dynamic-graph update (only changed edges)
        n_applied = dynamic_routing_graph.sync_from_traffic_engine(changed)

        # incident evaluation from traffic anomalies
        states_for_anomaly = {}
        for s in traffic_engine.all_states():
            if s.level == "UNKNOWN" or s.observed_kmh is None:
                continue
            edge = matcher.get_edge(s.edge_id)
            if edge is not None:
                states_for_anomaly[s.edge_id] = (
                    s.observed_kmh, s.sample_count, s.free_flow_kmh, edge.lat_u, edge.lng_u
                )
        new_anomalies = await incident_engine.evaluate_anomalies(states_for_anomaly)
        await incident_engine.expire_stale()

        # persist + broadcast traffic updates (throttled broadcast payload)
        await traffic_engine.persist_states(changed)
        if changed:
            await realtime_manager.broadcast({
                "type": "traffic_update",
                "updated_edges": len(changed),
                "levels": {s.edge_id: s.level for s in changed[:50]},
                "detail": [
                    {
                        "edge_id": s.edge_id,
                        "level": s.level,
                        "observed_kmh": s.observed_kmh,
                        "free_flow_kmh": s.free_flow_kmh,
                        "congestion_ratio": s.congestion_ratio,
                        "sample_count": s.sample_count,
                        "confidence": s.confidence,
                        "travel_time_s": s.travel_time_s,
                        "source": s.source,
                    }
                    for s in changed[:50]
                ],
            })

        self._last_traffic_cycle = time.time()
        return {
            "changed_edges": len(changed),
            "graph_updates_applied": n_applied,
            "new_anomaly_incidents": len(new_anomalies),
        }

    # ----------------------------------------------------------- QPSO cycle
    async def run_qpso_cycle(self) -> dict:
        """Event-driven optimization: evaluate routes for vehicles whose
        current route is materially affected by live conditions."""
        from app.traffic.engine import traffic_engine
        from app.routing.dynamic_graph import dynamic_routing_graph
        from app.routing.reroute_engine import reroute_engine
        from app.routing.qpso_selector import qpso_selector
        from app.realtime.manager import realtime_manager
        from app.core.config import settings as cfg

        results = {"vehicles_evaluated": 0, "routes_changed": 0, "optimization_id": None}

        rer = reroute_engine
        dg = dynamic_routing_graph
        if not dg.ensure_graph():
            return results

        evaluation_targets = []
        for vehicle_code, st in list(rer._vehicle_routes.items()):
            # Only evaluate vehicles with an active route + recent telemetry
            age = time.time() - self._vehicle_last_seen.get(vehicle_code, 0)
            if age > cfg.STALE_DEGRADED_S * 4:
                continue
            evaluation_targets.append((vehicle_code, st))

        if not evaluation_targets:
            return results

        run_id = f"opt_{int(time.time())}_{len(evaluation_targets)}"
        routes_changed = 0
        best_costs = []

        for vehicle_code, st in evaluation_targets[:25]:  # cap per cycle
            try:
                results["vehicles_evaluated"] += 1
                # destination = last node of current route
                if not st.edge_ids:
                    continue
                dest_node = st.edge_ids[-1].split("->")[-1]

                # where is the vehicle now? nearest graph node from last position
                from app.telemetry.service import telemetry_service
                last_fix = telemetry_service._last_fix.get(vehicle_code)
                if last_fix is None:
                    continue
                src_node = dg.nearest_node(last_fix["lat"], last_fix["lng"])
                if src_node is None:
                    continue

                # current route ETA from live graph
                current_lookup = self._edge_lookup(dg)
                current_time = sum(
                    float(self._edge_data(dg, eid).get("travel_time", 60.0))
                    for eid in st.edge_ids if self._edge_data(dg, eid) is not None
                )

                candidates = qpso_selector.build_candidates(dg, src_node, dest_node)
                if not candidates:
                    continue

                selection = qpso_selector.select(
                    candidates,
                    vehicle_speed_kmh=last_fix.get("speed_kmh"),
                    current_route_edge_ids=st.edge_ids,
                )
                if selection is None:
                    continue
                best_costs.append(selection.best_cost)

                new_edge_ids = selection.best.edge_ids
                candidate_eta = sum(
                    float(self._edge_data(dg, eid).get("travel_time", 60.0))
                    for eid in new_edge_ids if self._edge_data(dg, eid) is not None
                )

                # ---- reroute thresholds ------------------------------------
                # Detect immediate triggers: blocked edge on current route?
                immediate = None
                for eid in st.edge_ids:
                    data = self._edge_data(dg, eid)
                    if data and data.get("blocked"):
                        immediate = "BLOCKED_EDGE_ON_ROUTE"
                        break

                at_maneuver = False  # maneuver proximity handled via position vs next-node distance
                decision = rer.evaluate(
                    vehicle_id=vehicle_code,
                    current_eta_s=current_time,
                    candidate_eta_s=candidate_eta,
                    at_maneuver=at_maneuver,
                    immediate_reason=immediate,
                )
                if decision.should_reroute:
                    route_id = f"route_{vehicle_code}_{int(time.time())}"
                    await rer.commit_reroute(
                        vehicle_id=vehicle_code,
                        vehicle_code=vehicle_code,
                        decision=decision,
                        new_route_id=route_id,
                        new_edge_ids=new_edge_ids,
                        new_geometry=selection.best.geometry,
                        optimization_run_id=run_id,
                    )
                    routes_changed += 1
                    results["routes_changed"] = routes_changed
            except Exception as exc:
                logger.warning("QPSO cycle evaluation failed for %s: %s", vehicle_code, exc)

        # record optimization run metrics
        if results["vehicles_evaluated"] > 0:
            results["optimization_id"] = run_id
            self._optimization_runs += 1
            try:
                from app.routing.repository import OptimizationRunRepository
                from app.core.config import settings as cfg
                await OptimizationRunRepository().record_run(
                    run_code=run_id,
                    algorithm="Discrete QPSO Route Selector (live)",
                    vehicles_considered=results["vehicles_evaluated"],
                    iterations=cfg.QPSO_ITERATIONS,
                    population_size=cfg.QPSO_POPULATION_SIZE,
                    best_cost=min(best_costs) if best_costs else 0.0,
                    computation_ms=0.0,
                    routes_changed=routes_changed,
                    baseline_time_s=None,
                    optimized_time_s=None,
                    improvement_pct=None,
                    data_mode=cfg.DATA_MODE,
                    details={"cycle": "event_driven"},
                )
                await realtime_manager.broadcast({
                    "type": "optimization_complete",
                    "optimization_id": run_id,
                    "vehicles_considered": results["vehicles_evaluated"],
                    "routes_changed": routes_changed,
                    "best_cost": min(best_costs) if best_costs else None,
                })
            except Exception as exc:
                logger.warning("Optimization run record failed: %s", exc)

        self._last_qpso_cycle = time.time()
        return results

    # -------------------------------------------------------------- helpers
    def _edge_data(self, dg, edge_id: str) -> Optional[dict]:
        G = dg.graph
        if G is None or "->" not in str(edge_id):
            return None
        u, v = str(edge_id).split("->", 1)
        if G.has_edge(u, v):
            return G[u][v]
        return None

    def _edge_lookup(self, dg):
        def lookup(eid: str) -> Optional[dict]:
            return self._edge_data(dg, eid)
        return lookup

    # ------------------------------------------------------------- staleness
    async def sweep_staleness(self) -> dict:
        """Mark vehicles STALE/OFFLINE when GPS stops. Never extrapolate positions."""
        from app.telemetry.service import telemetry_service
        from app.realtime.manager import realtime_manager
        from app.telemetry.models import TrackingStatus

        now = time.time()
        transitions = 0
        for code, last_seen in list(self._vehicle_last_seen.items()):
            age = now - last_seen
            new_status = telemetry_service.tracking_status_for_age(age)
            if new_status in (TrackingStatus.STALE, TrackingStatus.OFFLINE):
                transitions += 1
                self._vehicle_last_seen.pop(code, None)
                await realtime_manager.broadcast({
                    "type": "vehicle_status",
                    "vehicle_id": code,
                    "status": new_status.value,
                    "age_s": round(age, 1),
                })
        return {"vehicles_marked_stale": transitions}

    # ---------------------------------------------------------------- worker
    async def start_workers(self) -> None:
        if self._running:
            return
        self._running = True
        self._workers = [
            asyncio.create_task(self._traffic_loop()),
            asyncio.create_task(self._qpso_loop()),
            asyncio.create_task(self._stale_loop()),
        ]
        logger.info("Pipeline workers started (traffic=%.0fs, qpso>=%.0fs, stale sweep active)",
                    settings.TRAFFIC_ENGINE_INTERVAL_S, settings.QPSO_MIN_INTERVAL_S)

    async def stop_workers(self) -> None:
        self._running = False
        for t in self._workers:
            t.cancel()

    async def _traffic_loop(self) -> None:
        while self._running:
            try:
                await asyncio.sleep(settings.TRAFFIC_ENGINE_INTERVAL_S)
                await self.run_traffic_cycle()
            except asyncio.CancelledError:
                break
            except Exception as exc:
                logger.warning("Traffic cycle error: %s", exc)
                await asyncio.sleep(2)

    async def _qpso_loop(self) -> None:
        while self._running:
            try:
                await asyncio.sleep(settings.QPSO_MIN_INTERVAL_S)
                await self.run_qpso_cycle()
            except asyncio.CancelledError:
                break
            except Exception as exc:
                logger.warning("QPSO cycle error: %s", exc)
                await asyncio.sleep(2)

    async def _stale_loop(self) -> None:
        while self._running:
            try:
                await asyncio.sleep(10)
                await self.sweep_staleness()
            except asyncio.CancelledError:
                break
            except Exception as exc:
                logger.warning("Staleness sweep error: %s", exc)

    def stats(self) -> dict:
        return {
            "workers_running": self._running,
            "vehicles_tracked": len(self._vehicle_last_seen),
            "last_traffic_cycle": self._last_traffic_cycle,
            "last_qpso_cycle": self._last_qpso_cycle,
            "optimization_cycles": self._optimization_runs,
        }


pipeline_orchestrator = PipelineOrchestrator()
