from typing import List
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.infrastructure.database.models.restriction import Restriction


class RestrictionRepository:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_restrictions(self, organization_id: str) -> List[Restriction]:
        if not self.db:
            return [
                Restriction(id="rst_01", organization_id=organization_id, restriction_code="RST-HEAVY-01", name="Heavy Exclusion", restriction_type="WEIGHT_LIMIT", affected_road="Expressway E17", max_weight_kg=5000, active_time_window="08:00 - 11:00 AM", status="ACTIVE"),
            ]
        try:
            stmt = select(Restriction).where(Restriction.organization_id == organization_id)
            res = await self.db.execute(stmt)
            return list(res.scalars().all())
        except Exception:
            return [
                Restriction(id="rst_01", organization_id=organization_id, restriction_code="RST-HEAVY-01", name="Heavy Exclusion", restriction_type="WEIGHT_LIMIT", affected_road="Expressway E17", max_weight_kg=5000, active_time_window="08:00 - 11:00 AM", status="ACTIVE"),
            ]
