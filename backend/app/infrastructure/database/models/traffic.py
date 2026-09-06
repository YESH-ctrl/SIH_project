from sqlalchemy import Column, String, Numeric, DateTime, ForeignKey, func
from sqlalchemy.dialects.postgresql import UUID
import uuid

from app.infrastructure.database.session import Base


class TrafficState(Base):
    __tablename__ = "traffic_states"
    __table_args__ = {"schema": "public"}

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    organization_id = Column(UUID(as_uuid=True), ForeignKey("public.organizations.id"), nullable=False)
    edge_id = Column(UUID(as_uuid=True), ForeignKey("public.network_edges.id"), nullable=True)
    road_segment_code = Column(String, nullable=False)
    road_name = Column(String, nullable=False)
    current_speed_kmh = Column(Numeric, default=40)
    free_flow_speed_kmh = Column(Numeric, default=50)
    congestion_percent = Column(Numeric, default=0)
    congestion_level = Column(String, default="NORMAL")
    created_at = Column(DateTime(timezone=True), server_default=func.now())
