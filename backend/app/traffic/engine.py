"""Live traffic engine.

For every OSM edge: collect GPS observations from vehicles map-matched to that
edge (+ optional external provider data), aggregate robustly (median/trimmed
mean, outlier rejection, min samples, TTL expiry), derive congestion_ratio,
travel_time and confidence, persist to traffic_edge_states and broadcast
traffic_update events.

Insufficient observations ⇒ edge stays UNKNOWN — never a fabricated speed.
"""
import math
import statistics
import threading
import time
from collections import defaultdict, deque
from dataclasses import dataclass
from datetime import datetime, timedelta, timezone
from typing import Deque, Dict, List, Optional, Tuple

from app.core.config import settings
from app.core.logging import logger


@dataclass
class EdgeObservation:
    speed_kmh: float
    observed_at: datetime
    source: str  # FLEET_GPS | SUMO | EXTERNAL


@dataclass
class EdgeTrafficState:
    edge_id: str
    network_id: str
    free_flow_kmh: float
    observed_kmh: Optional[float]
    sample_count: int
    confidence: float
    congestion_ratio: Optional[float]
    level: str
    travel_time_s: Optional[float]
    free_flow_time_s: float
    source: str
    updated_at: datetime


class TrafficEngine:
    """In-memory rolling window per edge, batch-flushed to DB + realtime."""

    def __init__(self):
        self._obs: Dict[str, Deque[EdgeObservation]] = defaultdict(lambda: deque(maxlen=64))
        self._edge_meta: Dict[str, dict] = {}      # edge_id -> {free_flow_kmh, length_m, network_id, lat, lng}
        self._states: Dict[str, EdgeTrafficState] = {}
        self._lock = threading.RLock()
        self._last_flush = 0.0
        self._last_external = 0.0

    # ----------------------------------------------------------- observations
    def register_edge(self, edge_id: str, network_id: str, free_flow_kmh: float,
                      length_m: float, lat: float, lng: float) -> None:
        with self._lock:
            self._edge_meta[edge_id] = {
                "free_flow_kmh": max(5.0, float(free_flow_kmh)),
                "length_m": max(1.0, float(length_m)),
                "network_id": network_id,
                "lat": lat,
                "lng": lng,
            }

    def add_observation(self, edge_id: str, speed_kmh: float, observed_at: datetime,
                        source: str = "FLEET_GPS") -> None:
        if speed_kmh is None or speed_kmh <= 0:
            return
        with self._lock:
            self._obs[edge_id].append(EdgeObservation(
                speed_kmh=float(speed_kmh), observed_at=observed_at, source=source
            ))

    # ----------------------------------------------------------- aggregation
    def _aggregate(self, edge_id: str, now: datetime) -> Optional[Tuple[float, int, float]]:
        """Robust aggregation for one edge. Returns (speed, samples, confidence) or None."""
        obs = self._obs.get(edge_id)
        if not obs:
            return None
        ttl = timedelta(seconds=settings.TRAFFIC_OBSERVATION_TTL_S)
        recent = [o.speed_kmh for o in obs if now - o.observed_at <= ttl]
        if not recent:
            return None
        n = len(recent)
        if n < settings.TRAFFIC_MIN_SAMPLES:
            return None  # UNKNOWN rather than fabricating a speed

        # Outlier rejection: drop samples beyond k std-devs from the median
        med = statistics.median(recent)
        if n >= 5:
            mad = statistics.median([abs(s - med) for s in recent]) or 1.0
            cleaned = [s for s in recent if abs(s - med) / (1.4826 * mad) <= settings.TRAFFIC_OUTLIER_STD_DEVS]
            if cleaned:
                recent = cleaned
                n = len(recent)

        speed = statistics.median(recent)
        spread = (statistics.pstdev(recent) if n > 1 else 0.0)
        # Confidence: more samples + tighter spread → higher
        sample_conf = min(1.0, n / 8.0)
        spread_conf = math.exp(-spread / max(med, 10.0))
        confidence = round(0.6 * sample_conf + 0.4 * spread_conf, 3)
        return round(speed, 1), n, max(0.05, min(1.0, confidence))

    # ------------------------------------------------------------------ cycle
    def recompute(self, now: Optional[datetime] = None) -> List[EdgeTrafficState]:
        """Recompute states for all edges with observations; return changed states."""
        now = now or datetime.now(timezone.utc)
        changed: List[EdgeTrafficState] = []
        with self._lock:
            for edge_id in list(self._obs.keys()):
                agg = self._aggregate(edge_id, now)
                meta = self._edge_meta.get(edge_id)
                if meta is None:
                    continue
                ff = meta["free_flow_kmh"]
                length_m = meta["length_m"]
                if agg is None:
                    # Insufficient/expired data: mark UNKNOWN, never fabricate.
                    state = self._states.get(edge_id)
                    if state is not None and state.level != "UNKNOWN":
                        state = EdgeTrafficState(
                            edge_id=edge_id, network_id=meta["network_id"],
                            free_flow_kmh=ff, observed_kmh=None, sample_count=0,
                            confidence=0.0, congestion_ratio=None, level="UNKNOWN",
                            travel_time_s=state.free_flow_time_s,
                            free_flow_time_s=length_m / (ff / 3.6),
                            source="UNKNOWN", updated_at=now,
                        )
                        self._states[edge_id] = state
                        changed.append(state)
                    elif state is None:
                        pass  # never observed enough: remains UNKNOWN implicitly
                    continue

                speed, samples, confidence = agg
                ratio = speed / ff
                travel = length_m / max(speed / 3.6, settings.TRAFFIC_MIN_SPEED_KMH / 3.6)
                ff_time = length_m / (ff / 3.6)
                level = self.classify(ratio)
                state = EdgeTrafficState(
                    edge_id=edge_id, network_id=meta["network_id"],
                    free_flow_kmh=ff, observed_kmh=speed, sample_count=samples,
                    confidence=confidence, congestion_ratio=round(ratio, 3),
                    level=level, travel_time_s=round(travel, 1),
                    free_flow_time_s=round(ff_time, 1),
                    source=self._source_label(edge_id), updated_at=now,
                )
                prev = self._states.get(edge_id)
                if prev is None or prev.level != level or prev.observed_kmh != speed:
                    changed.append(state)
                self._states[edge_id] = state
        return changed

    def _source_label(self, edge_id: str) -> str:
        obs = self._obs.get(edge_id) or []
        sources = {o.source for o in obs}
        if sources == {"EXTERNAL"}:
            return "EXTERNAL"
        if "FLEET_GPS" in sources or "SUMO" in sources:
            return "FLEET_GPS" if "FLEET_GPS" in sources else "SUMO"
        if "EXTERNAL" in sources:
            return "FUSION"
        return "UNKNOWN"

    @staticmethod
    def classify(ratio: float) -> str:
        """Configurable congestion thresholds:
        ratio = observed / free-flow. GREEN ≥ .75, YELLOW ≥ .5, ORANGE ≥ .3, RED < .3"""
        if ratio >= 0.75:
            return "GREEN"
        if ratio >= 0.5:
            return "YELLOW"
        if ratio >= 0.3:
            return "ORANGE"
        return "RED"

    # ------------------------------------------------------------- accessors
    def get_state(self, edge_id: str) -> Optional[EdgeTrafficState]:
        with self._lock:
            return self._states.get(edge_id)

    def all_states(self) -> List[EdgeTrafficState]:
        with self._lock:
            return list(self._states.values())

    def known_edges(self) -> List[str]:
        with self._lock:
            return [eid for eid, s in self._states.items() if s.level != "UNKNOWN"]

    # ------------------------------------------------------------ providers
    def maybe_refresh_external(self) -> None:
        """Pull external provider observations at a throttled interval."""
        now = time.monotonic()
        if now - self._last_external < settings.TRAFFIC_PROVIDER_MIN_INTERVAL_S:
            return
        self._last_external = now
        provider_name = (settings.TRAFFIC_PROVIDER or "none").lower()
        if provider_name == "none":
            return
        try:
            from app.traffic.providers import get_traffic_provider
            provider = get_traffic_provider()
            if not provider.available():
                return
            with self._lock:
                metas = [
                    {"edge_id": eid, "lat": m["lat"], "lng": m["lng"],
                     "speed_kph": m["free_flow_kmh"], "length_m": m["length_m"]}
                    for eid, m in list(self._edge_meta.items())[:50]
                ]
            for obs in provider.fetch_edge_speeds([], metas):
                self.add_observation(obs.edge_id, obs.speed_kmh, obs.observed_at, source="EXTERNAL")
        except Exception as exc:
            logger.warning("External traffic refresh failed: %s", exc)

    # ------------------------------------------------------------ persistence
    async def persist_states(self, states: List[EdgeTrafficState]) -> None:
        if not states:
            return
        try:
            from app.traffic.repository import TrafficEdgeStateRepository
            repo = TrafficEdgeStateRepository()
            await repo.upsert_states(states)
        except Exception as exc:
            logger.warning("traffic_edge_states persist failed: %s", exc)

    def stats(self) -> dict:
        with self._lock:
            levels = defaultdict(int)
            for s in self._states.values():
                levels[s.level] += 1
            return {
                "edges_observed": len(self._states),
                "edges_with_data": len(self.known_edges()),
                "congestion_levels": dict(levels),
            }


traffic_engine = TrafficEngine()
