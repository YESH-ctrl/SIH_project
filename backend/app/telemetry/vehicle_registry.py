"""Vehicle registry: maps provider vehicle codes (V-001, SUMO.42, ...) to DB rows.

Telemetry from unregistered devices creates a vehicle row so the fleet grows
organically with real trackers. Auto-created rows are clearly marked so the
operator can later rename/classify them.
"""
from datetime import datetime, timezone
from typing import Optional

from app.core.logging import logger


class VehicleRegistry:
    def __init__(self):
        self._cache = {}  # vehicle_code -> vehicle dict

    async def get_or_create(
        self, vehicle_code: str, organization_id: Optional[str] = None, telemetry_source: str = "unknown"
    ):
        """Return a lightweight vehicle descriptor for this code, creating a DB row if needed."""
        code = vehicle_code.strip().upper()
        if code in self._cache:
            return self._cache[code]

        try:
            from app.telemetry.repository import TelemetryRepository
            repo = TelemetryRepository()
            vehicle = await repo.get_or_create_vehicle(
                vehicle_code=code, organization_id=organization_id, telemetry_source=telemetry_source
            )
            if vehicle is not None:
                self._cache[code] = vehicle
            return vehicle
        except Exception as exc:
            logger.warning("Vehicle registry lookup failed for %s: %s", code, exc)
            return None

    def invalidate(self, vehicle_code: str) -> None:
        self._cache.pop(vehicle_code.strip().upper(), None)

    def clear(self) -> None:
        self._cache.clear()
