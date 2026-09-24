"""Telemetry ingestion service.

Pipeline for every PositionEvent regardless of provider:
  1. GPS validation (coords, timestamp, jumps, impossible speeds, staleness)
  2. persist raw fix into vehicle_positions
  3. map-match against the OSM network (app.network.map_matching)
  4. update current vehicle state (vehicles live columns)
  5. feed the traffic engine (app.traffic.engine) via edge observation
  6. publish realtime vehicle_position event
"""
import math
from collections import defaultdict
from datetime import datetime, timedelta, timezone
from typing import Dict, Optional

from app.core.config import settings
from app.core.logging import logger
from app.telemetry.models import (
    PositionEvent,
    TelemetryValidationResult,
    ValidationStatus,
    VehicleStateUpdate,
    TrackingStatus,
)
from app.telemetry.vehicle_registry import VehicleRegistry


class TelemetryValidationError(Exception):
    def __init__(self, status: ValidationStatus, reason: str):
        self.status = status
        self.reason = reason
        super().__init__(reason)


class TelemetryService:
    """Validates and ingests GPS positions. Provider-independent."""

    def __init__(self):
        # vehicle_code -> {ts, lat, lng, speed_kmh} of last accepted fix
        self._last_fix: Dict[str, dict] = {}
        self._vehicle_registry = VehicleRegistry()
        self._traffic_engine = None  # lazily wired to avoid import cycles
        self._realtime = None

    # ------------------------------------------------------------------ deps
    def wire_services(self, traffic_engine, realtime_manager) -> None:
        self._traffic_engine = traffic_engine
        self._realtime = realtime_manager

    @property
    def vehicle_registry(self) -> VehicleRegistry:
        return self._vehicle_registry

    # ------------------------------------------------------------- validation
    def validate_event(
        self,
        event: PositionEvent,
        last_fix: Optional[dict],
        now: Optional[datetime] = None,
    ) -> TelemetryValidationResult:
        now = now or datetime.now(timezone.utc)
        ts = event.ensure_utc()

        # -- timestamp sanity --------------------------------------------
        if ts > now + timedelta(seconds=settings.TELEMETRY_MAX_FUTURE_SKEW_S):
            return TelemetryValidationResult(
                accepted=False,
                status=ValidationStatus.REJECTED_BAD_TIMESTAMP,
                reason="GPS timestamp is in the future beyond allowed clock skew.",
            )
        if event.age_seconds(now) > settings.TELEMETRY_MAX_AGE_S:
            return TelemetryValidationResult(
                accepted=False,
                status=ValidationStatus.REJECTED_BAD_TIMESTAMP,
                reason=f"GPS fix is older than {settings.TELEMETRY_MAX_AGE_S:.0f}s (stale/replayed).",
            )

        # -- coordinate sanity -------------------------------------------
        if not (math.isfinite(event.latitude) and math.isfinite(event.longitude)):
            return TelemetryValidationResult(
                accepted=False, status=ValidationStatus.REJECTED_INVALID_COORDS,
                reason="Non-finite coordinates.",
            )

        # -- device-reported speed sanity ---------------------------------
        if event.speed_kmh is not None and event.speed_kmh > settings.TELEMETRY_MAX_SPEED_KMH:
            return TelemetryValidationResult(
                accepted=False, status=ValidationStatus.REJECTED_IMPOSSIBLE_SPEED,
                reason=f"Reported speed {event.speed_kmh:.1f} km/h exceeds physical limit.",
            )

        # -- GPS jump detection against the previous accepted fix ---------
        if last_fix is not None:
            dt = (ts - last_fix["ts"]).total_seconds()
            if dt <= 0:
                return TelemetryValidationResult(
                    accepted=False, status=ValidationStatus.REJECTED_OUT_OF_ORDER,
                    reason="Fix is not newer than the last accepted fix for this vehicle.",
                )
            dist = _haversine_m(
                last_fix["lat"], last_fix["lng"], event.latitude, event.longitude
            )
            implied_kmh = (dist / dt) * 3.6 if dt > 0 else 0.0
            if implied_kmh > settings.TELEMETRY_MAX_JUMP_SPEED_KMH:
                return TelemetryValidationResult(
                    accepted=False, status=ValidationStatus.REJECTED_GPS_JUMP,
                    reason=(
                        f"Implied speed {implied_kmh:.0f} km/h between fixes "
                        f"({dist:.0f} m in {dt:.0f} s) is physically impossible."
                    ),
                    implied_speed_kmh=round(implied_kmh, 1),
                    distance_from_previous_m=round(dist, 1),
                )

        return TelemetryValidationResult(accepted=True, status=ValidationStatus.ACCEPTED)

    # --------------------------------------------------------------- ingestion
    async def ingest(self, event: PositionEvent, organization_id: Optional[str] = None) -> VehicleStateUpdate:
        """Validate, persist, map-match, update state, publish. Raises TelemetryValidationError."""
        code = event.vehicle_id.strip().upper()
        event.vehicle_id = code

        last_fix = self._last_fix.get(code)
        validation = self.validate_event(event, last_fix)
        if not validation.accepted:
            logger.warning(
                "GPS ingestion rejected vehicle=%s status=%s reason=%s",
                code, validation.status.value, validation.reason,
            )
            raise TelemetryValidationError(validation.status, validation.reason)

        self._last_fix[code] = {
            "ts": event.ensure_utc(),
            "lat": event.latitude,
            "lng": event.longitude,
            "speed_kmh": event.speed_kmh,
        }

        # 1. resolve/create the vehicle row (provider-independent registry)
        vehicle = await self._vehicle_registry.get_or_create(
            code, organization_id=organization_id, telemetry_source=event.source.value
        )

        # 2. map-match against the OSM network
        match = None
        try:
            from app.network.map_matching import get_map_matcher
            matcher = get_map_matcher()
            match = matcher.match(event.latitude, event.longitude, heading_deg=event.heading_deg)
        except Exception as exc:  # network not imported yet — vehicle still tracked
            logger.warning("Map matching unavailable for vehicle=%s: %s", code, exc)

        # 3. persist raw fix + update current state
        from app.telemetry.repository import TelemetryRepository
        repo = TelemetryRepository()
        await repo.store_position(
            vehicle_id=vehicle.id if vehicle else None,
            vehicle_code=code,
            organization_id=organization_id or (str(vehicle.organization_id) if vehicle else None),
            event=event,
            match=match,
        )

        # 4. traffic engine observation for the matched edge
        if match is not None and event.speed_kmh is not None:
            if self._traffic_engine is not None:
                try:
                    self._traffic_engine.add_observation(
                        network_id=match.network_id,
                        edge_id=match.edge_id,
                        speed_kmh=event.speed_kmh,
                        observed_at=event.ensure_utc(),
                        source="FLEET_GPS" if event.source.value != "sumo" else "SUMO",
                    )
                except Exception as exc:
                    logger.warning("Traffic observation failed vehicle=%s: %s", code, exc)

        # 5. build the unified state update
        update = VehicleStateUpdate(  # noqa: E501
            vehicle_id=code,
            vehicle_code=code,
            db_vehicle_id=str(vehicle.id) if vehicle else None,
            timestamp=event.ensure_utc(),
            latitude=event.latitude,
            longitude=event.longitude,
            speed_kmh=event.speed_kmh,
            heading_deg=event.heading_deg,
            accuracy_m=event.accuracy_m,
            matched_edge_id=match.edge_id if match else None,
            matched_edge_fraction=match.fraction if match else None,
            match_confidence=match.confidence if match else None,
            road_name=match.road_name if match else None,
            tracking_status=TrackingStatus.LIVE,
            source=event.source,
        )
        update.published_event = {
            "type": "vehicle_position",
            "vehicle_id": code,
            "timestamp": update.timestamp.isoformat(),
            "lat": update.latitude,
            "lng": update.longitude,
            "speed_kmh": update.speed_kmh,
            "heading_deg": update.heading_deg,
            "accuracy_m": update.accuracy_m,
            "edge_id": update.matched_edge_id,
            "road_name": update.road_name,
            "status": update.tracking_status.value,
            "source": event.source.value,
            "mode": "SIMULATION" if event.source.value == "sumo" else "LIVE",
        }

        # 6. realtime publish (pipeline orchestrator owns the broadcast)
        try:
            from app.core.pipeline import pipeline_orchestrator
            await pipeline_orchestrator.handle_position_update(update)
        except Exception as exc:
            logger.warning("Realtime publish failed for %s: %s", code, exc)

        return update

    # -------------------------------------------------------------- staleness
    def tracking_status_for_age(self, age_s: float) -> TrackingStatus:
        if age_s < settings.STALE_LIVE_S:
            return TrackingStatus.LIVE
        if age_s < settings.STALE_DEGRADED_S:
            return TrackingStatus.DEGRADED
        if age_s < settings.STALE_STALE_S:
            return TrackingStatus.STALE
        if age_s < settings.STALE_OFFLINE_S:
            return TrackingStatus.OFFLINE
        return TrackingStatus.OFFLINE


def _haversine_m(lat1: float, lng1: float, lat2: float, lng2: float) -> float:
    R = 6371000.0
    phi1, phi2 = math.radians(lat1), math.radians(lat2)
    dphi = math.radians(lat2 - lat1)
    dlam = math.radians(lng2 - lng1)
    a = math.sin(dphi / 2) ** 2 + math.cos(phi1) * math.cos(phi2) * math.sin(dlam / 2) ** 2
    return R * 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))


# Module-level singleton so all providers share one ingestion pipeline
telemetry_service = TelemetryService()
