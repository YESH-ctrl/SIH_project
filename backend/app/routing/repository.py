"""Repositories for reroute_log and optimization run metrics."""
import uuid
from datetime import datetime, timezone
from typing import Optional

from sqlalchemy import select

from app.core.logging import logger
from app.infrastructure.database.session import AsyncSessionLocal
from app.infrastructure.database.models.optimization import OptimizationRun
from app.infrastructure.database.models.traffic_live import RerouteLog


class RerouteLogRepository:
    async def log_reroute(
        self,
        vehicle_code: str,
        old_route_id: Optional[str],
        new_route_id: str,
        old_eta_s: Optional[float],
        new_eta_s: Optional[float],
        improvement_s: Optional[float],
        improvement_pct: Optional[float],
        reason: str,
        optimization_run_id: Optional[str] = None,
        organization_id: Optional[str] = None,
        details: Optional[dict] = None,
    ) -> None:
        async with AsyncSessionLocal() as db:
            try:
                org_id = organization_id
                if not org_id:
                    from sqlalchemy import text
                    res = await db.execute(text("SELECT id FROM public.organizations ORDER BY created_at LIMIT 1"))
                    row = res.first()
                    org_id = str(row[0]) if row else None

                run_uuid = None
                if optimization_run_id:
                    stmt = select(OptimizationRun.id).where(OptimizationRun.run_code == optimization_run_id).limit(1)
                    row = (await db.execute(stmt)).scalar_one_or_none()
                    run_uuid = row

                db.add(RerouteLog(
                    organization_id=uuid.UUID(org_id) if org_id else None,
                    vehicle_id=await self._vehicle_uuid(db, vehicle_code),
                    vehicle_code=vehicle_code,
                    optimization_run_id=run_uuid,
                    old_route_id=old_route_id,
                    new_route_id=new_route_id,
                    old_eta_s=old_eta_s,
                    new_eta_s=new_eta_s,
                    eta_improvement_s=improvement_s,
                    eta_improvement_pct=improvement_pct,
                    reason=reason,
                    details=details,
                ))
                await db.commit()
            except Exception as exc:
                await db.rollback()
                logger.warning("RerouteLog insert failed: %s", exc)

    async def _vehicle_uuid(self, db, vehicle_code: str):
        from app.infrastructure.database.models.vehicle import Vehicle
        try:
            stmt = select(Vehicle.id).where(Vehicle.vehicle_code == vehicle_code).limit(1)
            return (await db.execute(stmt)).scalar_one_or_none()
        except Exception:
            return None


class OptimizationRunRepository:
    async def record_run(
        self,
        run_code: str,
        algorithm: str,
        vehicles_considered: int,
        iterations: int,
        population_size: int,
        best_cost: float,
        computation_ms: float,
        routes_changed: int,
        baseline_time_s: Optional[float],
        optimized_time_s: Optional[float],
        improvement_pct: Optional[float],
        data_mode: str,
        details: Optional[dict] = None,
        organization_id: Optional[str] = None,
    ) -> None:
        async with AsyncSessionLocal() as db:
            try:
                org_id = organization_id
                if not org_id:
                    from sqlalchemy import text
                    res = await db.execute(text("SELECT id FROM public.organizations ORDER BY created_at LIMIT 1"))
                    row = res.first()
                    org_id = str(row[0]) if row else None

                db.add(OptimizationRun(
                    organization_id=uuid.UUID(org_id) if org_id else None,
                    run_code=run_code,
                    algorithm=algorithm,
                    vehicles_count=vehicles_considered,
                    customers_count=0,
                    status="Completed",
                    optimization_id=run_code,
                    vehicles_considered=vehicles_considered,
                    iterations=iterations,
                    population_size=population_size,
                    best_cost=best_cost,
                    computation_time_ms=computation_ms,
                    routes_changed=routes_changed,
                    baseline_total_time_s=baseline_time_s,
                    optimized_total_time_s=optimized_time_s,
                    improvement_pct=improvement_pct,
                    data_mode=data_mode,
                    result_details=details,
                ))
                await db.commit()
            except Exception as exc:
                await db.rollback()
                logger.warning("OptimizationRun record failed: %s", exc)
