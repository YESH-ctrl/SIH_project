from sqlalchemy import Column, String, Integer, Numeric, DateTime, ForeignKey, func
from sqlalchemy.dialects.postgresql import UUID, JSONB
import uuid

from app.infrastructure.database.session import Base


class Route(Base):
    __tablename__ = "routes"
    __table_args__ = {"schema": "public"}

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    organization_id = Column(UUID(as_uuid=True), ForeignKey("public.organizations.id"), nullable=False)
    route_code = Column(String, nullable=False)
    vehicle_id = Column(UUID(as_uuid=True), ForeignKey("public.vehicles.id"), nullable=True)
    depot_id = Column(UUID(as_uuid=True), ForeignKey("public.depots.id"), nullable=True)
    optimization_run_id = Column(UUID(as_uuid=True), ForeignKey("public.optimization_runs.id"), nullable=True)
    status = Column(String, nullable=False, default="PLANNED")
    distance_km = Column(Numeric, default=0)
    estimated_duration_min = Column(Numeric, default=0)
    actual_duration_min = Column(Numeric, nullable=True)
    delay_min = Column(Integer, default=0)
    geometry_geojson = Column(JSONB, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class RouteStop(Base):
    __tablename__ = "route_stops"
    __table_args__ = {"schema": "public"}

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    organization_id = Column(UUID(as_uuid=True), ForeignKey("public.organizations.id"), nullable=False)
    route_id = Column(UUID(as_uuid=True), ForeignKey("public.routes.id", ondelete="CASCADE"), nullable=False)
    delivery_point_id = Column(UUID(as_uuid=True), ForeignKey("public.delivery_points.id"), nullable=True)
    sequence_number = Column(Integer, nullable=False)
    eta = Column(String, nullable=True)
    actual_arrival_time = Column(DateTime(timezone=True), nullable=True)
    status = Column(String, nullable=False, default="PENDING")
    created_at = Column(DateTime(timezone=True), server_default=func.now())
