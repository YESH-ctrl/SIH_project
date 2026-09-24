from sqlalchemy import Column, String, Integer, Double, DateTime, ForeignKey, func
from sqlalchemy.dialects.postgresql import UUID, JSONB, ARRAY
import uuid

from app.infrastructure.database.session import Base


class Incident(Base):
    __tablename__ = "incidents"
    __table_args__ = {"schema": "public"}

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    organization_id = Column(UUID(as_uuid=True), ForeignKey("public.organizations.id"), nullable=False)
    incident_code = Column(String, nullable=False)
    title = Column(String, nullable=False)
    road_name = Column(String, nullable=False)
    type = Column(String, nullable=False)
    severity = Column(String, nullable=False)
    affected_vehicles_count = Column(Integer, default=0)
    affected_routes_count = Column(Integer, default=0)
    status = Column(String, nullable=False, default="Active")
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # ---- Live incident lifecycle columns (added by realtime_schema.sql) ----
    latitude = Column(Double, nullable=True)
    longitude = Column(Double, nullable=True)
    detected_at = Column(DateTime(timezone=True), nullable=True)
    updated_at = Column(DateTime(timezone=True), nullable=True)
    expires_at = Column(DateTime(timezone=True), nullable=True)
    confidence = Column(Double, nullable=True)
    source = Column(String, nullable=False, default="MANUAL")
    affected_edge_ids = Column(ARRAY(UUID(as_uuid=True)), nullable=True)
    affected_edges_json = Column(JSONB, nullable=True)
    evidence_count = Column(Integer, default=0)
    resolution_note = Column(String, nullable=True)
    resolved_at = Column(DateTime(timezone=True), nullable=True)
