from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import CurrentUser, require_permission
from app.core.permissions import Permission
from app.infrastructure.database.session import get_db
from app.infrastructure.database.repositories.restriction_repository import RestrictionRepository

router = APIRouter(prefix="/restrictions", tags=["Restrictions"])


@router.get(
    "",
    summary="Get List of Road Restrictions",
)
async def get_restrictions(
    current_user: CurrentUser = Depends(require_permission(Permission.RESTRICTIONS_VIEW)),
    db: AsyncSession = Depends(get_db),
):
    repo = RestrictionRepository(db)
    restrictions = await repo.get_restrictions(current_user.organization_id)
    return {
        "data": [
            {
                "id": str(r.id),
                "restriction_code": r.restriction_code,
                "name": r.name,
                "restriction_type": r.restriction_type,
                "affected_road": r.affected_road,
                "max_weight_kg": float(r.max_weight_kg) if r.max_weight_kg is not None else None,
                "active_time_window": r.active_time_window,
                "status": r.status,
            }
            for r in restrictions
        ]
    }
