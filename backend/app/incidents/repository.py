"""Incident persistence mirroring the in-memory lifecycle into PostgreSQL."""
import json
import uuid
from datetime import datetime, timezone
from typing import List, Optional

from sqlalchemy import select, update

from app.core.logging import logger
from app.infrastructure.database.session import AsyncSessionLocal
from app.infrastructure.database.models.incident import Incident
from app.incidents.engine import Incident


class IncidentRepository:
    async def upsert_incident(self, inc: Incident) -> None:
        async with AsyncSessionLocal() as db:
            try:
                org_id = await self._default_org(db)
                stmt = select(Incident).where(Incident.incident_code == inc.id).limit(1)
                row = (await db.execute(stmt)).scalar_one_or_none()
                if row is None:
                    row = Incident(
                        organization_id=uuid.UUID(org_id) if org_id else None,
                        incident_code=inc.id,
                        title=inc.title or f"{inc.type} on {inc.road_name or 'road'}",
                        road_name=inc.road_name or "OSM Road",
                        type=inc.type,
                        severity=inc.severity,
                    )
                    db.add(row)
                row.status = inc.status
                row.latitude = inc.latitude
                row.longitude = inc.longitude
                row.detected_at = inc.detected_at
                row.updated_at = inc.updated_at
                row.expires_at = inc.expires_at
                row.confidence = inc.confidence
                row.source = inc.source
                row.evidence_count = inc.evidence_count
                row.resolution_note = inc.resolution_note
                row.resolved_at = inc.updated_at if inc.status == "RESOLVED" else None
                row.affected_edges_json = json.dumps(inc.affected_edge_ids)
                await db.commit()
            except Exception as exc:
                await db.rollback()
                logger.warning("Incident upsert failed: %s", exc)

    async def _default_org(self, db) -> Optional[str]:
        from sqlalchemy import text
        res = await db.execute(text("SELECT id FROM public.organizations ORDER BY created_at LIMIT 1"))
        row = res.first()
        return str(row[0]) if row else None
