"""Shared, provider-independent GPS position event.

Every telemetry source — Android tracker, Traccar, any GPS gateway, SUMO
simulation adapter, deterministic test fixtures — is normalised into a
PositionEvent before entering the processing pipeline. Downstream stages
(validation → map matching → vehicle state → traffic engine) never know which
provider produced a given event.
"""
from datetime import datetime, timezone
from enum import Enum
from typing import Optional

from pydantic import BaseModel, Field


class TelemetrySource(str, Enum):
    ANDROID = "android"
    GPS_TRACKER = "gps_tracker"
    TRACCAR = "traccar"
    SUMO = "sumo"
    TEST = "test"


class TrackingStatus(str, Enum):
    LIVE = "LIVE"
    DEGRADED = "DEGRADED"
    STALE = "STALE"
    OFFLINE = "OFFLINE"


class ValidationStatus(str, Enum):
    ACCEPTED = "ACCEPTED"
    REJECTED_INVALID_COORDS = "REJECTED_INVALID_COORDS"
    REJECTED_BAD_TIMESTAMP = "REJECTED_BAD_TIMESTAMP"
    REJECTED_IMPOSSIBLE_SPEED = "REJECTED_IMPOSSIBLE_SPEED"
    REJECTED_GPS_JUMP = "REJECTED_GPS_JUMP"
    REJECTED_OUT_OF_REGION = "REJECTED_OUT_OF_REGION"
    REJECTED_OUT_OF_ORDER = "REJECTED_OUT_OF_ORDER"


class PositionEvent(BaseModel):
    """A single GPS position report, normalised across all providers."""

    vehicle_id: str = Field(..., min_length=1, max_length=64, description="Vehicle code, e.g. V-001")
    timestamp: datetime
    latitude: float = Field(..., ge=-90.0, le=90.0)
    longitude: float = Field(..., ge=-180.0, le=180.0)
    speed_kmh: Optional[float] = Field(default=None, ge=0.0, le=400.0)
    heading_deg: Optional[float] = Field(default=None, ge=0.0, le=360.0)
    accuracy_m: Optional[float] = Field(default=None, ge=0.0, le=10000.0)
    altitude_m: Optional[float] = None
    source: TelemetrySource = TelemetrySource.GPS_TRACKER

    def age_seconds(self, now: Optional[datetime] = None) -> float:
        now = now or datetime.now(timezone.utc)
        ts = self.timestamp if self.timestamp.tzinfo else self.timestamp.replace(tzinfo=timezone.utc)
        return (now - ts).total_seconds()

    def ensure_utc(self) -> datetime:
        return self.timestamp if self.timestamp.tzinfo else self.timestamp.replace(tzinfo=timezone.utc)


class TelemetryValidationResult(BaseModel):
    """Outcome of validating a PositionEvent against vehicle history."""

    accepted: bool
    status: ValidationStatus
    reason: str = ""
    implied_speed_kmh: Optional[float] = None
    distance_from_previous_m: Optional[float] = None


class VehicleStateUpdate(BaseModel):
    """Result of processing an accepted PositionEvent through the pipeline."""

    vehicle_id: str
    vehicle_code: str
    db_vehicle_id: Optional[str] = None
    timestamp: datetime
    latitude: float
    longitude: float
    speed_kmh: Optional[float] = None
    heading_deg: Optional[float] = None
    accuracy_m: Optional[float] = None
    matched_edge_id: Optional[str] = None
    matched_edge_fraction: Optional[float] = None
    match_confidence: Optional[float] = None
    road_name: Optional[str] = None
    tracking_status: TrackingStatus = TrackingStatus.LIVE
    source: TelemetrySource = TelemetrySource.GPS_TRACKER
    published_event: Optional[dict] = None
