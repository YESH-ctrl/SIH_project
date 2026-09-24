from sqlalchemy import Column, String, Numeric, Double, DateTime, ForeignKey, func
from sqlalchemy.dialects.postgresql import UUID
import uuid

from app.infrastructure.database.session import Base


class Vehicle(Base):
    __tablename__ = "vehicles"
    __table_args__ = {"schema": "public"}

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    organization_id = Column(UUID(as_uuid=True), ForeignKey("public.organizations.id"), nullable=False)
    vehicle_code = Column(String, nullable=False)
    name = Column(String, nullable=False)
    type = Column(String, nullable=False)
    capacity_kg = Column(Numeric, nullable=False)
    current_load_kg = Column(Numeric, default=0)
    status = Column(String, nullable=False, default="Active")
    current_location = Column(String, nullable=True)
    next_stop = Column(String, nullable=True)
    eta = Column(String, nullable=True)
    route_id = Column(String, nullable=True)
    lat = Column(Numeric, nullable=True)
    lng = Column(Numeric, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # ---- Live telemetry state (added by realtime_schema.sql migration) ----
    current_lat = Column(Double, nullable=True)
    current_lng = Column(Double, nullable=True)
    current_speed_kmh = Column(Double, nullable=True)
    current_heading_deg = Column(Double, nullable=True)
    last_gps_timestamp = Column(DateTime(timezone=True), nullable=True)
    last_gps_accuracy_m = Column(Double, nullable=True)
    current_edge_id = Column(UUID(as_uuid=True), nullable=True)
    tracking_status = Column(String, nullable=False, default="OFFLINE")
    last_match_confidence = Column(Double, nullable=True)
    telemetry_source = Column(String, nullable=True)
    current_route_id = Column(String, nullable=True)
    destination_lat = Column(Double, nullable=True)
    destination_lng = Column(Double, nullable=True)
    destination_name = Column(String, nullable=True)
    current_route_eta_s = Column(Double, nullable=True)
    alternative_route_eta_s = Column(Double, nullable=True)
    last_reroute_at = Column(DateTime(timezone=True), nullable=True)
    last_reroute_reason = Column(String, nullable=True)
    telemetry_source_mode = Column(String, nullable=True, default="NONE")
