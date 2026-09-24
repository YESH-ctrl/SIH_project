from sqlalchemy import Column, String, Double, Integer, DateTime, ForeignKey, func, UniqueConstraint
from sqlalchemy.dialects.postgresql import UUID, JSONB
import uuid

from app.infrastructure.database.session import Base


class TrafficEdgeState(Base):
    """Unified live traffic state for one directed OSM edge.

    `source` records which input actually produced the observation:
      FLEET_GPS     — derived from real vehicle telemetry map-matched to this edge
      EXTERNAL      — external traffic provider (Google/Mapbox adapter)
      FUSION        — fleet + external + incidents combined
      UNKNOWN       — no observation yet (edge cost falls back to free flow)
    """
    __tablename__ = "traffic_edge_states"
    __table_args__ = (
        UniqueConstraint("network_id", "edge_id", name="uq_traffic_edge_state"),
        {"schema": "public"},
    )

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    network_id = Column(UUID(as_uuid=True), ForeignKey("public.road_networks.id", ondelete="CASCADE"), nullable=False)
    edge_id = Column(UUID(as_uuid=True), ForeignKey("public.network_edges.id", ondelete="CASCADE"), nullable=False)
    free_flow_speed_kmh = Column(Double, nullable=False, default=50)
    observed_speed_kmh = Column(Double, nullable=True)
    sample_count = Column(Integer, nullable=False, default=0)
    speed_confidence = Column(Double, nullable=False, default=0)
    congestion_ratio = Column(Double, nullable=True)
    congestion_level = Column(String, nullable=False, default="UNKNOWN")
    travel_time_seconds = Column(Double, nullable=True)
    free_flow_time_seconds = Column(Double, nullable=True)
    source = Column(String, nullable=False, default="UNKNOWN")
    provider = Column(String, nullable=True)
    provider_updated_at = Column(DateTime(timezone=True), nullable=True)
    fleet_updated_at = Column(DateTime(timezone=True), nullable=True)
    updated_at = Column(DateTime(timezone=True), nullable=False, server_default=func.now(), onupdate=func.now())
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class RerouteLog(Base):
    """Audit trail of every dynamic reroute decision (measurable, Section 14)."""
    __tablename__ = "reroute_log"
    __table_args__ = {"schema": "public"}

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    organization_id = Column(UUID(as_uuid=True), ForeignKey("public.organizations.id"), nullable=True)
    vehicle_id = Column(UUID(as_uuid=True), ForeignKey("public.vehicles.id"), nullable=True)
    vehicle_code = Column(String, nullable=True)
    optimization_run_id = Column(UUID(as_uuid=True), ForeignKey("public.optimization_runs.id"), nullable=True)
    old_route_id = Column(String, nullable=True)
    new_route_id = Column(String, nullable=True)
    old_route_summary = Column(JSONB, nullable=True)
    new_route_summary = Column(JSONB, nullable=True)
    old_eta_s = Column(Double, nullable=True)
    new_eta_s = Column(Double, nullable=True)
    eta_improvement_s = Column(Double, nullable=True)
    eta_improvement_pct = Column(Double, nullable=True)
    reason = Column(String, nullable=False)
    details = Column(JSONB, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
