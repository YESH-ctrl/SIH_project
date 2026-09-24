"""External traffic provider abstraction.

Providers adapt vendor APIs into the common ProviderObservation shape.
`none` provider = fleet GPS only. External data is fused with fleet telemetry
but never impersonates it: each traffic_edge_state row records `source` and
`provider`, and the UI displays provenance.
"""
import time
from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from datetime import datetime, timezone
from typing import Dict, List, Optional

import httpx

from app.core.config import settings
from app.core.logging import logger


@dataclass
class ProviderObservation:
    edge_id: str
    speed_kmh: float
    free_flow_kmh: float
    confidence: float
    observed_at: datetime
    provider: str
    metadata: dict = field(default_factory=dict)


class TrafficProvider(ABC):
    """Interface every external traffic adapter implements."""

    name: str = "abstract"

    @abstractmethod
    def available(self) -> bool:
        ...

    @abstractmethod
    def fetch_edge_speeds(
        self, edge_bboxes: List[dict], edge_meta: List[dict]
    ) -> List[ProviderObservation]:
        """Return observations for the requested edges (bbox + metadata lists)."""

    # Shared courtesy caching: never hammer external APIs.
    _cache: Dict[str, tuple] = {}

    def _cache_get(self, key: str, ttl: float):
        hit = self._cache.get(key)
        if hit and time.monotonic() - hit[1] < ttl:
            return hit[0]
        return None

    def _cache_put(self, key: str, value) -> None:
        self._cache[key] = (value, time.monotonic())


class NoTrafficProvider(TrafficProvider):
    """Fleet-GPS-only configuration (TRAFFIC_PROVIDER=none)."""

    name = "none"

    def available(self) -> bool:
        return True

    def fetch_edge_speeds(self, edge_bboxes, edge_meta) -> List[ProviderObservation]:
        return []


class GoogleTrafficProvider(TrafficProvider):
    """Google traffic-aware routing adapter (Routes API / Roads snapping).

    Uses the Routes computeRouteMatrix semantics conceptually; here it maps a
    small batch of edge midpoints to congestion-scaled speeds via the Distance
    Matrix-style duration_in_traffic vs static duration ratio.
    """

    name = "google"
    BASE_URL = "https://maps.googleapis.com/maps/api/distancematrix/json"

    def available(self) -> bool:
        return bool(settings.TRAFFIC_API_KEY)

    def fetch_edge_speeds(self, edge_bboxes, edge_meta) -> List[ProviderObservation]:
        if not self.available() or not edge_meta:
            return []
        cache_key = f"google:{hash(tuple(m['edge_id'] for m in edge_meta))}"
        cached = self._cache_get(cache_key, settings.TRAFFIC_PROVIDER_CACHE_TTL_S)
        if cached is not None:
            return cached

        now = datetime.now(timezone.utc)
        observations: List[ProviderObservation] = []
        try:
            # Batch edges into origin/destination strings (midpoint coords).
            origins = "|".join(f"{m['lat']},{m['lng']}" for m in edge_meta[:25])
            destinations = origins
            resp = httpx.get(
                self.BASE_URL,
                params={
                    "origins": origins,
                    "destinations": destinations,
                    "mode": "driving",
                    "departure_time": "now",
                    "key": settings.TRAFFIC_API_KEY,
                },
                timeout=8.0,
            )
            resp.raise_for_status()
            data = resp.json()
            rows = data.get("rows", [])
            for i, meta in enumerate(edge_meta[:25]):
                try:
                    el = rows[i]["elements"][i]
                    base_s = el.get("duration", {}).get("value")
                    traffic_s = el.get("duration_in_traffic", {}).get("value")
                    if not base_s or not traffic_s:
                        continue
                    ratio = base_s / max(traffic_s, 1)  # <1 congested
                    speed = float(meta.get("speed_kph", 40)) * max(0.05, min(1.2, ratio))
                    observations.append(ProviderObservation(
                        edge_id=meta["edge_id"],
                        speed_kmh=round(speed, 1),
                        free_flow_kmh=float(meta.get("speed_kph", 40)),
                        confidence=0.7,
                        observed_at=now,
                        provider=self.name,
                        metadata={"duration_s": traffic_s, "base_s": base_s},
                    ))
                except (IndexError, KeyError, TypeError, ValueError):
                    continue
            self._cache_put(cache_key, observations)
        except Exception as exc:
            logger.warning("Google traffic provider failed: %s", exc)
            self._cache_put(cache_key, [])
        return observations


class MapboxTrafficProvider(TrafficProvider):
    """Mapbox Traffic adapter using the Directions API traffic-aware duration."""

    name = "mapbox"
    BASE_URL = "https://api.mapbox.com/directions-matrix/v1/mapbox/driving"

    def available(self) -> bool:
        return bool(settings.TRAFFIC_API_KEY)

    def fetch_edge_speeds(self, edge_bboxes, edge_meta) -> List[ProviderObservation]:
        if not self.available() or not edge_meta:
            return []
        cache_key = f"mapbox:{hash(tuple(m['edge_id'] for m in edge_meta))}"
        cached = self._cache_get(cache_key, settings.TRAFFIC_PROVIDER_CACHE_TTL_S)
        if cached is not None:
            return cached

        now = datetime.now(timezone.utc)
        observations: List[ProviderObservation] = []
        try:
            coords = ";".join(f"{m['lng']},{m['lat']}" for m in edge_meta[:20])
            resp = httpx.get(
                f"{self.BASE_URL}/{coords}",
                params={"access_token": settings.TRAFFIC_API_KEY, "annotations": "duration"},
                timeout=8.0,
            )
            resp.raise_for_status()
            data = resp.json()
            durations = data.get("durations", [])
            for i, meta in enumerate(edge_meta[:20]):
                try:
                    d = durations[i][i]
                    if d is None:
                        continue
                    length_km = float(meta.get("length_m", 300)) / 1000.0
                    speed = (length_km / (d / 3600.0)) if d > 0 else float(meta.get("speed_kph", 40))
                    observations.append(ProviderObservation(
                        edge_id=meta["edge_id"],
                        speed_kmh=round(max(3.0, min(speed, 130.0)), 1),
                        free_flow_kmh=float(meta.get("speed_kph", 40)),
                        confidence=0.65,
                        observed_at=now,
                        provider=self.name,
                        metadata={"matrix_duration_s": d},
                    ))
                except (IndexError, KeyError, TypeError, ValueError):
                    continue
            self._cache_put(cache_key, observations)
        except Exception as exc:
            logger.warning("Mapbox traffic provider failed: %s", exc)
            self._cache_put(cache_key, [])
        return observations


def get_traffic_provider() -> TrafficProvider:
    name = (settings.TRAFFIC_PROVIDER or "none").lower()
    if name == "google":
        return GoogleTrafficProvider()
    if name == "mapbox":
        return MapboxTrafficProvider()
    return NoTrafficProvider()
