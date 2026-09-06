from sqlalchemy import Column, String, Numeric, DateTime, ForeignKey, func
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
