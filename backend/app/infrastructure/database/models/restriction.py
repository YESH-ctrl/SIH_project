from sqlalchemy import Column, String, Numeric, DateTime, ForeignKey, func
from sqlalchemy.dialects.postgresql import UUID
import uuid

from app.infrastructure.database.session import Base


class Restriction(Base):
    __tablename__ = "restrictions"
    __table_args__ = {"schema": "public"}

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    organization_id = Column(UUID(as_uuid=True), ForeignKey("public.organizations.id"), nullable=False)
    restriction_code = Column(String, nullable=False)
    name = Column(String, nullable=False)
    restriction_type = Column(String, nullable=False)
    affected_road = Column(String, nullable=False)
    max_weight_kg = Column(Numeric, nullable=True)
    active_time_window = Column(String, nullable=True)
    status = Column(String, default="ACTIVE")
    created_at = Column(DateTime(timezone=True), server_default=func.now())
