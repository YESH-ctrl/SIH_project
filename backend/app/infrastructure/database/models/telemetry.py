from sqlalchemy import Column, String, Double, DateTime, ForeignKey, func
from sqlalchemy.dialects.postgresql import UUID, JSONB
import uuid

from app.infrastructure.database.session import Base


class VehiclePosition(Base):
    """Raw, immutable GPS telemetry history (one row per accepted GPS fix)."""
    __tablename__ = "vehicle_positions"
    __table_args__ = {"schema": "public"}

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    vehicle_id = Column(UUID(as_uuid=True), ForeignKey("public.vehicles.id", ondelete="CASCADE"), nullable=True)
    vehicle_code = Column(String, nullable=True)
    organization_id = Column(UUID(as_uuid=True), ForeignKey("public.organizations.id"), nullable=True)
    timestamp = Column("timestamp", DateTime(timezone=True), nullable=False)
    latitude = Column(Double, nullable=False)
    longitude = Column(Double, nullable=False)
    speed_kmh = Column(Double, nullable=True)
    heading_deg = Column(Double, nullable=True)
    accuracy_m = Column(Double, nullable=True)
    altitude_m = Column(Double, nullable=True)
    source = Column(String, nullable=False, default="unknown")
    matched_edge_id = Column(UUID(as_uuid=True), ForeignKey("public.network_edges.id"), nullable=True)
    matched_edge_fraction = Column(Double, nullable=True)
    matched_distance_m = Column(Double, nullable=True)
    match_confidence = Column(Double, nullable=True)
    validation_status = Column(String, nullable=False, default="ACCEPTED")
    raw_payload = Column(JSONB, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())


# Additive live-state columns on the existing vehicles table. Declared as a
# mixin-style extension so the original Vehicle model file stays untouched and
# existing code keeps importing `Vehicle` from vehicle.py.
LIVE_VEHICLE_COLUMNS = {
    "current_lat": Column(Double, nullable=True),
    "current_lng": Column(Double, nullable=True),
    "current_speed_kmh": Column(Double, nullable=True),
    "current_heading_deg": Column(Double, nullable=True),
    "last_gps_timestamp": Column(DateTime(timezone=True), nullable=True),
    "last_gps_accuracy_m": Column(Double, nullable=True),
    "current_edge_id": Column(UUID(as_uuid=True), ForeignKey("public.network_edges.id"), nullable=True),
    "tracking_status": Column(String, nullable=False, default="OFFLINE"),
    "last_match_confidence": Column(Double, nullable=True),
    "telemetry_source": Column(String, nullable=True),
    "current_route_id": Column(String, nullable=True),
    "destination_lat": Column(Double, nullable=True),
    "destination_lng": Column(Double, nullable=True),
    "destination_name": Column(String, nullable=True),
    "current_route_eta_s": Column(Double, nullable=True),
    "alternative_route_eta_s": Column(Double, nullable=True),
    "last_reroute_at": Column(DateTime(timezone=True), nullable=True),
    "last_reroute_reason": Column(String, nullable=True),
    "telemetry_source_mode": Column(String, nullable=True, default="NONE"),
}
