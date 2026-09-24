"""Telemetry ingestion API.

POST /api/v1/telemetry/position       — single GPS fix from any provider
POST /api/v1/telemetry/position/batch — queued fixes from offline trackers

Authentication: Bearer GPS_AUTH_SECRET (device key) or a Supabase JWT.
Rate limiting: in-memory per-vehicle token bucket (extendable to Redis).
"""
import time
from collections import defaultdict, deque
from typing import List, Optional

from fastapi import APIRouter, Header, HTTPException, Request, status
from pydantic import BaseModel, Field

from app.core.config import settings
from app.core.logging import logger
from app.telemetry.models import PositionEvent, TelemetrySource
from app.telemetry.service import TelemetryService, telemetry_service

router = APIRouter(prefix="/telemetry", tags=["Telemetry Ingestion"])


# --------------------------------------------------------------------- auth
def _check_device_auth(authorization: Optional[str]) -> bool:
    """Telemetry devices authenticate with a shared secret; Supabase JWTs are
    also accepted so dashboard-initiated test posts work."""
    if settings.ENVIRONMENT == "development" and not settings.GPS_AUTH_SECRET:
        return True  # local dev convenience; production requires the secret
    if not authorization:
        return False
    if not authorization.startswith("Bearer "):
        return False
    token = authorization.split(" ", 1)[1].strip()
    if settings.GPS_AUTH_SECRET and token == settings.GPS_AUTH_SECRET:
        return True
    # Supabase JWT shape (eyJ...) — validated opportunistically
    if token.count(".") == 2 and len(token) > 40:
        try:
            from app.core.security import get_current_user  # noqa: F401
            from jose import jwt
            jwt.decode(
                token, settings.SUPABASE_JWT_SECRET or settings.GPS_AUTH_SECRET,
                options={"verify_signature": bool(settings.SUPABASE_JWT_SECRET), "verify_aud": False},
            )
            return True
        except Exception:
            return False
    return False


# ---------------------------------------------------------------- rate limit
class _RateLimiter:
    def __init__(self):
        self._hits = defaultdict(deque)

    def allow(self, key: str, per_minute: int) -> bool:
        now = time.monotonic()
        q = self._hits[key]
        while q and q[0] < now - 60.0:
            q.popleft()
        if len(q) >= per_minute:
            return False
        q.append(now)
        return True


_rate_limiter = _RateLimiter()


class TelemetryAck(BaseModel):
    accepted: bool = True
    vehicle_id: str
    matched_edge_id: Optional[str] = None
    road_name: Optional[str] = None
    match_confidence: Optional[float] = None
    tracking_status: str = "LIVE"
    mode: str = "LIVE"


# --------------------------------------------------------------- endpoints
@router.post("/position", response_model=TelemetryAck)
async def post_position(
    event: PositionEvent,
    authorization: Optional[str] = Header(None),
):
    if not _check_device_auth(authorization):
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Missing or invalid telemetry credentials.")
    if not _rate_limiter.allow(f"veh:{event.vehicle_id}", settings.TELEMETRY_RATE_LIMIT_PER_MIN):
        raise HTTPException(status.HTTP_429_TOO_MANY_REQUESTS, "Telemetry rate limit exceeded for this vehicle.")

    try:
        update = await telemetry_service.ingest(event)
    except Exception as exc:
        status_code = getattr(exc, "status_code", None)
        if status_code == 422 or "REJECTED" in str(getattr(exc, "status", "")):
            raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, str(exc))
        logger.exception("Telemetry ingestion failed for %s", event.vehicle_id)
        raise HTTPException(status.HTTP_500_INTERNAL_SERVER_ERROR, f"Telemetry ingestion failed: {exc}")

    return TelemetryAck(
        vehicle_id=update.vehicle_id,
        matched_edge_id=update.matched_edge_id,
        road_name=update.road_name,
        match_confidence=update.match_confidence,
        tracking_status=update.tracking_status.value,
        mode=update.published_event.get("mode", "LIVE") if update.published_event else "LIVE",
    )


class BatchPositionRequest(BaseModel):
    positions: List[PositionEvent] = Field(..., min_length=1, max_length=500)


class BatchPositionAck(BaseModel):
    accepted_count: int
    rejected_count: int
    rejected: List[dict] = []
    results: List[TelemetryAck] = []


@router.post("/position/batch", response_model=BatchPositionAck)
async def post_position_batch(
    batch: BatchPositionRequest,
    authorization: Optional[str] = Header(None),
):
    """Accept queued fixes from devices that were temporarily offline.
    Each fix is validated independently; rejections are itemised, never silent."""
    if not _check_device_auth(authorization):
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Missing or invalid telemetry credentials.")

    # Order oldest -> newest so jump validation sees a coherent trajectory.
    ordered = sorted(batch.positions, key=lambda p: p.timestamp)
    acks: List[TelemetryAck] = []
    rejected: List[dict] = []
    for event in ordered:
        if not _rate_limiter.allow(f"veh:{event.vehicle_id}", settings.TELEMETRY_RATE_LIMIT_PER_MIN * 2):
            rejected.append({"vehicle_id": event.vehicle_id, "timestamp": event.timestamp.isoformat(),
                             "reason": "rate_limited"})
            continue
        try:
            update = await telemetry_service.ingest(event)
            acks.append(TelemetryAck(
                vehicle_id=update.vehicle_id,
                matched_edge_id=update.matched_edge_id,
                road_name=update.road_name,
                match_confidence=update.match_confidence,
                tracking_status=update.tracking_status.value,
                mode=update.published_event.get("mode", "LIVE") if update.published_event else "LIVE",
            ))
        except Exception as exc:
            rejected.append({
                "vehicle_id": event.vehicle_id,
                "timestamp": event.timestamp.isoformat(),
                "reason": str(exc),
                "status": str(getattr(exc, "status", "ERROR")),
            })
    return BatchPositionAck(accepted_count=len(acks), rejected_count=len(rejected), rejected=rejected, results=acks)
