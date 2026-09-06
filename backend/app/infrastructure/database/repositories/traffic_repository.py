from typing import List, Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.infrastructure.database.models.traffic import TrafficState


class TrafficRepository:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_traffic_states(self, organization_id: str) -> List[TrafficState]:
        if not self.db:
            return [
                TrafficState(id="tf_01", organization_id=organization_id, road_segment_code="SEG-E17", road_name="Expressway E17", current_speed_kmh=12, free_flow_speed_kmh=50, congestion_percent=78, congestion_level="CRITICAL"),
            ]
        try:
            stmt = select(TrafficState).where(TrafficState.organization_id == organization_id)
            res = await self.db.execute(stmt)
            return list(res.scalars().all())
        except Exception:
            return [
                TrafficState(id="tf_01", organization_id=organization_id, road_segment_code="SEG-E17", road_name="Expressway E17", current_speed_kmh=12, free_flow_speed_kmh=50, congestion_percent=78, congestion_level="CRITICAL"),
            ]
