from sqlalchemy import Column, String, Integer, Numeric, Double, DateTime, ForeignKey, func
from sqlalchemy.dialects.postgresql import UUID, JSONB
import uuid

from app.infrastructure.database.session import Base


class OptimizationRun(Base):
    __tablename__ = "optimization_runs"
    __table_args__ = {"schema": "public"}

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    organization_id = Column(UUID(as_uuid=True), ForeignKey("public.organizations.id"), nullable=False)
    run_code = Column(String, nullable=False)
    algorithm = Column(String, nullable=False)
    vehicles_count = Column(Integer, nullable=False)
    customers_count = Column(Integer, nullable=False)
    fitness_score = Column(Numeric, nullable=True)
    runtime_sec = Column(Numeric, nullable=True)
    travel_time_saved_percent = Column(Numeric, nullable=True)
    status = Column(String, nullable=False, default="Completed")
    parameters = Column(JSONB, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # ---- QPSO experimental metrics (added by realtime_schema.sql) ----
    optimization_id = Column(String, nullable=True)
    vehicles_considered = Column(Integer, nullable=True)
    iterations = Column(Integer, nullable=True)
    population_size = Column(Integer, nullable=True)
    best_cost = Column(Double, nullable=True)
    computation_time_ms = Column(Double, nullable=True)
    routes_changed = Column(Integer, nullable=True)
    baseline_total_time_s = Column(Double, nullable=True)
    optimized_total_time_s = Column(Double, nullable=True)
    improvement_pct = Column(Double, nullable=True)
    data_mode = Column(String, nullable=True)
    result_details = Column(JSONB, nullable=True)


class OptimizationResult(Base):
    __tablename__ = "optimization_results"
    __table_args__ = {"schema": "public"}

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    organization_id = Column(UUID(as_uuid=True), ForeignKey("public.organizations.id"), nullable=False)
    optimization_run_id = Column(UUID(as_uuid=True), ForeignKey("public.optimization_runs.id", ondelete="CASCADE"), nullable=False)
    vehicle_id = Column(UUID(as_uuid=True), ForeignKey("public.vehicles.id"), nullable=True)
    route_id = Column(UUID(as_uuid=True), ForeignKey("public.routes.id"), nullable=True)
    total_distance_km = Column(Numeric, nullable=True)
    total_travel_time_min = Column(Numeric, nullable=True)
    congestion_avoided_percent = Column(Numeric, nullable=True)
    fitness_value = Column(Numeric, nullable=True)
    result_details = Column(JSONB, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

