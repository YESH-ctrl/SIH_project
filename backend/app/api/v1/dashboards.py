from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import CurrentUser, get_current_user, require_permission
from app.core.permissions import Permission
from app.infrastructure.database.session import get_db
from app.application.dashboards.dashboard_service import DashboardService
from app.schemas.dashboard import (
    AdminDashboardResponse,
    OperationsDashboardResponse,
    DispatcherDashboardResponse,
    AnalystDashboardResponse,
)

router = APIRouter(prefix="/dashboards", tags=["Dashboards"])


@router.get(
    "/admin",
    response_model=AdminDashboardResponse,
    summary="Get Organization Admin Dashboard Metrics",
)
async def get_admin_dashboard(
    current_user: CurrentUser = Depends(require_permission(Permission.ORGANIZATION_VIEW)),
    db: AsyncSession = Depends(get_db),
):
    service = DashboardService(db)
    return await service.get_admin_dashboard(current_user)


@router.get(
    "/operations",
    response_model=OperationsDashboardResponse,
    summary="Get Operations Manager Dashboard Metrics",
)
async def get_operations_dashboard(
    current_user: CurrentUser = Depends(require_permission(Permission.DASHBOARD_VIEW)),
    db: AsyncSession = Depends(get_db),
):
    service = DashboardService(db)
    return await service.get_operations_dashboard(current_user)


@router.get(
    "/dispatcher",
    response_model=DispatcherDashboardResponse,
    summary="Get Dispatcher Dashboard Metrics",
)
async def get_dispatcher_dashboard(
    current_user: CurrentUser = Depends(require_permission(Permission.INCIDENTS_VIEW)),
    db: AsyncSession = Depends(get_db),
):
    service = DashboardService(db)
    return await service.get_dispatcher_dashboard(current_user)


@router.get(
    "/analyst",
    response_model=AnalystDashboardResponse,
    summary="Get Analyst Dashboard Metrics",
)
async def get_analyst_dashboard(
    current_user: CurrentUser = Depends(require_permission(Permission.ANALYTICS_VIEW)),
    db: AsyncSession = Depends(get_db),
):
    service = DashboardService(db)
    return await service.get_analyst_dashboard(current_user)
