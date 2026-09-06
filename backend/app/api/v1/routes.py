from typing import Optional, List
from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import CurrentUser, require_permission
from app.core.permissions import Permission
from app.infrastructure.database.session import get_db
from app.infrastructure.database.repositories.route_repository import RouteRepository
from app.core.exceptions import ResourceNotFound

router = APIRouter(prefix="/routes", tags=["Routes"])


@router.get(
    "",
    summary="Get List of Fleet Routes",
)
async def get_routes(
    status: Optional[str] = Query(None, description="Filter by status (e.g. PLANNED, IN_PROGRESS, DELAYED)"),
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=100),
    current_user: CurrentUser = Depends(require_permission(Permission.ROUTES_VIEW)),
    db: AsyncSession = Depends(get_db),
):
    repo = RouteRepository(db)
    routes = await repo.get_routes_by_org(current_user.organization_id, status=status, page=page, page_size=page_size)
    
    return {
        "data": [
            {
                "id": str(r.id),
                "route_code": r.route_code,
                "status": r.status,
                "distance_km": float(r.distance_km or 0),
                "estimated_duration_min": float(r.estimated_duration_min or 0),
                "delay_min": r.delay_min,
                "created_at": r.created_at.isoformat() if r.created_at else None,
            }
            for r in routes
        ],
        "pagination": {"page": page, "page_size": page_size, "total": len(routes)},
    }


@router.get(
    "/{id}",
    summary="Get Route Details by ID",
)
async def get_route_by_id(
    id: str,
    current_user: CurrentUser = Depends(require_permission(Permission.ROUTES_VIEW)),
    db: AsyncSession = Depends(get_db),
):
    repo = RouteRepository(db)
    route = await repo.get_route_by_id(id, current_user.organization_id)
    if not route:
        raise ResourceNotFound("Route", id)

    stops = await repo.get_route_stops(id, current_user.organization_id)
    return {
        "data": {
            "id": str(route.id),
            "route_code": route.route_code,
            "status": route.status,
            "distance_km": float(route.distance_km or 0),
            "estimated_duration_min": float(route.estimated_duration_min or 0),
            "delay_min": route.delay_min,
            "stops": [
                {
                    "id": str(s.id),
                    "sequence_number": s.sequence_number,
                    "eta": s.eta,
                    "status": s.status,
                }
                for s in stops
            ],
        }
    }


@router.post(
    "/{id}/dispatch",
    summary="Dispatch Route to Active Vehicle",
)
async def dispatch_route(
    id: str,
    current_user: CurrentUser = Depends(require_permission(Permission.ROUTES_DISPATCH)),
    db: AsyncSession = Depends(get_db),
):
    repo = RouteRepository(db)
    route = await repo.get_route_by_id(id, current_user.organization_id)
    if not route:
        raise ResourceNotFound("Route", id)

    route.status = "DISPATCHED"
    return {"data": {"id": str(route.id), "status": "DISPATCHED", "message": "Route successfully dispatched"}}
