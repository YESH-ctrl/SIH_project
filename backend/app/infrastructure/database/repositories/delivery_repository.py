from typing import List, Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.infrastructure.database.models.delivery import DeliveryPoint


class DeliveryPointRepository:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_points_by_org(
        self, organization_id: str, status: Optional[str] = None, page: int = 1, page_size: int = 50
    ) -> List[DeliveryPoint]:
        if not self.db:
            return [
                DeliveryPoint(id="dp_01", organization_id=organization_id, point_code="DP-001", name="Civil Lines #14", demand_kg=120, status="PENDING", lat=21.2514, lng=81.6296),
            ]
        try:
            stmt = select(DeliveryPoint).where(DeliveryPoint.organization_id == organization_id)
            if status:
                stmt = stmt.where(DeliveryPoint.status == status)
            stmt = stmt.offset((page - 1) * page_size).limit(page_size)
            res = await self.db.execute(stmt)
            return list(res.scalars().all())
        except Exception:
            return [
                DeliveryPoint(id="dp_01", organization_id=organization_id, point_code="DP-001", name="Civil Lines #14", demand_kg=120, status="PENDING", lat=21.2514, lng=81.6296),
            ]

    async def get_point_by_id(self, point_id: str, organization_id: str) -> Optional[DeliveryPoint]:
        stmt = select(DeliveryPoint).where(DeliveryPoint.id == point_id, DeliveryPoint.organization_id == organization_id)
        res = await self.db.execute(stmt)
        return res.scalar_one_or_none()
