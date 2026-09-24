"""Persistence for unified traffic_edge_states."""
import uuid
from typing import List, Optional

from sqlalchemy import select

from app.core.logging import logger
from app.infrastructure.database.session import AsyncSessionLocal
from app.infrastructure.database.models.traffic_live import TrafficEdgeState
from app.traffic.engine import EdgeTrafficState


class TrafficEdgeStateRepository:
    async def upsert_states(self, states: List[EdgeTrafficState]) -> int:
        count = 0
        async with AsyncSessionLocal() as db:
            try:
                for s in states:
                    try:
                        net_uuid = uuid.UUID(str(s.network_id))
                        edge_uuid = uuid.UUID(str(s.edge_id))
                    except (ValueError, TypeError, AttributeError):
                        # Edge ids from the runtime graph are node-pairs, not DB UUIDs;
                        # resolve via the map matcher's DB edge map when available.
                        edge_uuid = await self._resolve_edge_uuid(db, s.edge_id)
                        if edge_uuid is None:
                            continue
                        net_uuid = await self._network_uuid(db, s.network_id)
                        if net_uuid is None:
                            continue

                    stmt = select(TrafficEdgeState).where(
                        TrafficEdgeState.network_id == net_uuid,
                        TrafficEdgeState.edge_id == edge_uuid,
                    )
                    row = (await db.execute(stmt)).scalar_one_or_none()
                    if row is None:
                        row = TrafficEdgeState(network_id=net_uuid, edge_id=edge_uuid)
                        db.add(row)
                    row.free_flow_speed_kmh = s.free_flow_kmh
                    row.observed_speed_kmh = s.observed_kmh
                    row.sample_count = s.sample_count
                    row.speed_confidence = s.confidence
                    row.congestion_ratio = s.congestion_ratio
                    row.congestion_level = s.level
                    row.travel_time_seconds = s.travel_time_s
                    row.free_flow_time_seconds = s.free_flow_time_s
                    row.source = s.source
                    row.updated_at = s.updated_at
                    count += 1
                await db.commit()
            except Exception as exc:
                await db.rollback()
                logger.warning("TrafficEdgeState upsert failed: %s", exc)
        return count

    async def _resolve_edge_uuid(self, db, edge_id_str: str) -> Optional[uuid.UUID]:
        """Map a runtime 'u->v' edge id to the DB network_edges UUID via node pair."""
        try:
            from sqlalchemy import text
            if "->" in str(edge_id_str):
                u, v = str(edge_id_str).split("->", 1)
                res = await db.execute(text(
                    "SELECT e.id FROM public.network_edges e "
                    "JOIN public.network_nodes fu ON fu.id = e.from_node_id "
                    "JOIN public.network_nodes tv ON tv.id = e.to_node_id "
                    "WHERE fu.external_id = :u AND tv.external_id = :v LIMIT 1"
                ), {"u": str(u), "v": str(v)})
                row = res.first()
                if row:
                    return row[0]
            else:
                return uuid.UUID(str(edge_id_str))
        except Exception:
            return None
        return None

    async def _network_uuid(self, db, network_id) -> Optional[uuid.UUID]:
        try:
            return uuid.UUID(str(network_id))
        except (ValueError, TypeError):
            from sqlalchemy import text
            res = await db.execute(text("SELECT id FROM public.road_networks ORDER BY created_at LIMIT 1"))
            row = res.first()
            return row[0] if row else None

    async def get_edge_states(self, network_id: Optional[str] = None, limit: int = 2000):
        async with AsyncSessionLocal() as db:
            stmt = select(TrafficEdgeState).order_by(TrafficEdgeState.updated_at.desc()).limit(limit)
            if network_id:
                try:
                    stmt = stmt.where(TrafficEdgeState.network_id == uuid.UUID(network_id))
                except ValueError:
                    pass
            res = await db.execute(stmt)
            return list(res.scalars().all())
