from sqlalchemy import Column, String, Integer, DateTime, ForeignKey, func
from sqlalchemy.dialects.postgresql import UUID
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
