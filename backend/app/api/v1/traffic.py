from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import CurrentUser, require_permission
from app.core.permissions import Permission
from app.infrastructure.database.session import get_db
from app.infrastructure.database.repositories.traffic_repository import TrafficRepository

router = APIRouter(prefix="/traffic", tags=["Traffic"])


@router.get(
    "",
    summary="Get Current Network Traffic States",
)
async def get_traffic(
    current_user: CurrentUser = Depends(require_permission(Permission.TRAFFIC_VIEW)),
    db: AsyncSession = Depends(get_db),
):
    repo = TrafficRepository(db)
    states = await repo.get_traffic_states(current_user.organization_id)
    return {
        "data": [
            {
                "id": str(ts.id),
                "road_segment_code": ts.road_segment_code,
                "road_name": ts.road_name,
                "current_speed_kmh": float(ts.current_speed_kmh or 40),
                "free_flow_speed_kmh": float(ts.free_flow_speed_kmh or 50),
                "congestion_percent": float(ts.congestion_percent or 0),
                "congestion_level": ts.congestion_level,
            }
            for ts in states
        ]
    }
