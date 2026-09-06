from sqlalchemy import Column, String, Integer, Numeric, DateTime, ForeignKey, func
from sqlalchemy.dialects.postgresql import UUID
import uuid

from app.infrastructure.database.session import Base


class DeliveryPoint(Base):
    __tablename__ = "delivery_points"
    __table_args__ = {"schema": "public"}

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    organization_id = Column(UUID(as_uuid=True), ForeignKey("public.organizations.id"), nullable=False)
    customer_id = Column(UUID(as_uuid=True), ForeignKey("public.customers.id"), nullable=True)
    point_code = Column(String, nullable=False)
    name = Column(String, nullable=False)
    demand_kg = Column(Numeric, default=50)
    time_window_start = Column(String, nullable=True)
    time_window_end = Column(String, nullable=True)
    service_time_seconds = Column(Integer, default=600)
    priority = Column(String, default="Standard")
    status = Column(String, nullable=False, default="PENDING")
    lat = Column(Numeric, nullable=False)
    lng = Column(Numeric, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
