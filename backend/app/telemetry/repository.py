"""Telemetry persistence: raw GPS history + current vehicle state."""
import json
import uuid
from datetime import datetime, timezone
from typing import Optional

from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.logging import logger
from app.infrastructure.database.session import AsyncSessionLocal
from app.infrastructure.database.models.vehicle import Vehicle
from app.infrastructure.database.models.telemetry import VehiclePosition
from app.telemetry.models import PositionEvent, TrackingStatus


class _EdgeMatch:
    """Minimal structural type produced by the map matcher (avoids import cycle)."""

    edge_id: str
    fraction: float
    confidence: float
    distance_m: float
    road_name: str
    network_id: str


class TelemetryRepository:
    """DB access for telemetry ingestion. Opens its own sessions so the API
    layer stays thin and ingestion works from background services too."""

    async def get_or_create_vehicle(
        self, vehicle_code: str, organization_id: Optional[str] = None, telemetry_source: str = "unknown"
    ) -> Optional[Vehicle]:
        async with AsyncSessionLocal() as db:
            try:
                stmt = select(Vehicle).where(Vehicle.vehicle_code == vehicle_code).limit(1)
                row = (await db.execute(stmt)).scalar_one_or_none()
                if row:
                    return row

                org_id = organization_id
                if not org_id:
                    from sqlalchemy import text
                    res = await db.execute(text("SELECT id FROM public.organizations ORDER BY created_at LIMIT 1"))
                    org_row = res.first()
                    org_id = str(org_row[0]) if org_row else None
                if not org_id:
                    logger.error("Cannot auto-register vehicle %s: no organization exists.", vehicle_code)
                    return None

                vehicle = Vehicle(
                    organization_id=uuid.UUID(org_id),
                    vehicle_code=vehicle_code,
                    name=f"Tracker {vehicle_code}",
                    type="Van",
                    capacity_kg=1000,
                    status="Active",
                    tracking_status=TrackingStatus.LIVE.value,
                    telemetry_source=telemetry_source,
                )
                db.add(vehicle)
                await db.commit()
                await db.refresh(vehicle)
                logger.info("Auto-registered vehicle %s (source=%s)", vehicle_code, telemetry_source)
                return vehicle
            except Exception as exc:
                await db.rollback()
                logger.error("get_or_create_vehicle(%s) failed: %s", vehicle_code, exc)
                return None

    async def store_position(
        self,
        vehicle_id: Optional[str],
        vehicle_code: str,
        organization_id: Optional[str],
        event: PositionEvent,
        match=None,
    ) -> None:
        edge_uuid = None
        if match is not None and match.edge_id:
            try:
                edge_uuid = uuid.UUID(str(match.edge_id))
            except (ValueError, TypeError, AttributeError):
                edge_uuid = None

        async with AsyncSessionLocal() as db:
            try:
                db.add(VehiclePosition(
                    vehicle_id=uuid.UUID(str(vehicle_id)) if vehicle_id else None,
                    vehicle_code=vehicle_code,
                    organization_id=uuid.UUID(str(organization_id)) if organization_id else None,
                    timestamp=event.ensure_utc(),
                    latitude=event.latitude,
                    longitude=event.longitude,
                    speed_kmh=event.speed_kmh,
                    heading_deg=event.heading_deg,
                    accuracy_m=event.accuracy_m,
                    altitude_m=event.altitude_m,
                    source=event.source.value,
                    matched_edge_id=edge_uuid,
                    matched_edge_fraction=match.fraction if match else None,
                    matched_distance_m=match.distance_m if match else None,
                    match_confidence=match.confidence if match else None,
                    validation_status="ACCEPTED",
                    raw_payload=json.loads(event.model_dump_json()),
                ))
                await db.commit()
            except Exception as exc:
                await db.rollback()
                logger.error("store_position(%s) failed: %s", vehicle_code, exc)
                return

            # Update the current-state representation on vehicles
            try:
                await db.execute(
                    update(Vehicle)
                    .where(Vehicle.vehicle_code == vehicle_code)
                    .values(
                        current_lat=event.latitude,
                        current_lng=event.longitude,
                        current_speed_kmh=event.speed_kmh,
                        current_heading_deg=event.heading_deg,
                        last_gps_timestamp=event.ensure_utc(),
                        last_gps_accuracy_m=event.accuracy_m,
                        current_edge_id=edge_uuid,
                        last_match_confidence=match.confidence if match else None,
                        tracking_status=TrackingStatus.LIVE.value,
                        telemetry_source=event.source.value,
                        telemetry_source_mode="SIMULATION" if event.source.value == "sumo" else "LIVE",
                    )
                )
                await db.commit()
            except Exception as exc:
                await db.rollback()
                logger.error("update_vehicle_state(%s) failed: %s", vehicle_code, exc)

    async def get_positions(self, vehicle_code: str, limit: int = 200):
        async with AsyncSessionLocal() as db:
            stmt = (
                select(VehiclePosition)
                .where(VehiclePosition.vehicle_code == vehicle_code)
                .order_by(VehiclePosition.timestamp.desc())
                .limit(limit)
            )
            res = await db.execute(stmt)
            return list(res.scalars().all())
