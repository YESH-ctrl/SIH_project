from typing import Optional
from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import CurrentUser, require_permission
from app.core.permissions import Permission
from app.infrastructure.database.session import get_db
from app.infrastructure.database.repositories.delivery_repository import DeliveryPointRepository
from app.core.exceptions import ResourceNotFound

router = APIRouter(prefix="/delivery-points", tags=["Delivery Points"])


@router.get(
    "",
    summary="Get List of Delivery Points",
)
async def get_delivery_points(
    status: Optional[str] = Query(None, description="Filter status (e.g. PENDING, IN_PROGRESS, COMPLETED)"),
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=100),
    current_user: CurrentUser = Depends(require_permission(Permission.CUSTOMERS_VIEW)),
    db: AsyncSession = Depends(get_db),
):
    repo = DeliveryPointRepository(db)
    points = await repo.get_points_by_org(current_user.organization_id, status=status, page=page, page_size=page_size)
    return {
        "data": [
            {
                "id": str(p.id),
                "point_code": p.point_code,
                "name": p.name,
                "demand_kg": float(p.demand_kg or 0),
                "status": p.status,
                "lat": float(p.lat),
                "lng": float(p.lng),
            }
            for p in points
        ],
        "pagination": {"page": page, "page_size": page_size, "total": len(points)},
    }


@router.get(
    "/{id}",
    summary="Get Delivery Point by ID",
)
async def get_delivery_point_by_id(
    id: str,
    current_user: CurrentUser = Depends(require_permission(Permission.CUSTOMERS_VIEW)),
    db: AsyncSession = Depends(get_db),
):
    repo = DeliveryPointRepository(db)
    point = await repo.get_point_by_id(id, current_user.organization_id)
    if not point:
        raise ResourceNotFound("DeliveryPoint", id)
    return {
        "data": {
            "id": str(point.id),
            "point_code": point.point_code,
            "name": point.name,
            "demand_kg": float(point.demand_kg or 0),
            "status": point.status,
            "lat": float(point.lat),
            "lng": float(point.lng),
        }
    }
