"""Realtime event bus.

FastAPI WebSocket endpoint + in-process pub/sub manager. Every pipeline stage
publishes here: vehicle_position, vehicle_status, traffic_update,
incident_created/updated, route_update, optimization_complete, system_status.

Frontend clients subscribe once and receive all fleet state changes without
polling. Providers (Android, SUMO) never publish directly — only the pipeline
does, so clients can trust event provenance from `mode` and `source` fields.
"""
import asyncio
import json
from collections import defaultdict, deque
from datetime import datetime, timezone
from typing import Deque, Dict, Optional, Set

from fastapi import APIRouter, WebSocket, WebSocketDisconnect

from app.core.config import settings
from app.core.logging import logger

router = APIRouter(tags=["Realtime"])


class RealtimeManager:
    def __init__(self):
        self._connections: Set[WebSocket] = set()
        self._lock = asyncio.Lock()
        self._subscribers: Dict[str, int] = defaultdict(int)
        # Replay buffer so a reconnecting client can catch up briefly.
        self._recent: Deque[str] = deque(maxlen=200)

    async def connect(self, ws: WebSocket) -> bool:
        async with self._lock:
            if len(self._connections) >= settings.REALTIME_MAX_CONNECTIONS:
                return False
            self._connections.add(ws)
        return True

    def disconnect(self, ws: WebSocket) -> None:
        self._connections.discard(ws)

    async def broadcast(self, event: dict) -> None:
        """Publish one event to every connected dashboard client."""
        event = dict(event)
        event.setdefault("server_time", datetime.now(timezone.utc).isoformat())
        payload = json.dumps(event, default=str)
        self._recent.append(payload)
        self._subscribers[event.get("type", "unknown")] += 1
        dead = []
        async with self._lock:
            targets = list(self._connections)
        for ws in targets:
            try:
                await ws.send_text(payload)
            except Exception:
                dead.append(ws)
        for ws in dead:
            self.disconnect(ws)

    def publish(self, event: dict) -> None:
        """Fire-and-forget publish safe to call from sync code (SUMO adapter)."""
        try:
            loop = asyncio.get_running_loop()
            loop.create_task(self.broadcast(event))
        except RuntimeError:
            # No running loop (sync context): keep the buffer consistent only.
            self._recent.append(json.dumps(event, default=str))

    def replay_recent(self) -> list:
        return list(self._recent)

    def stats(self) -> dict:
        return {
            "connected_clients": len(self._connections),
            "events_published": sum(self._subscribers.values()),
            "by_type": dict(self._subscribers),
        }


realtime_manager = RealtimeManager()


@router.websocket("/ws/live")
async def websocket_live(ws: WebSocket):
    """Dashboard realtime channel. Client may send {"type":"ping"} keepalives
    or {"type":"replay"} to receive the last events again after reconnect."""
    await ws.accept()
    ok = await realtime_manager.connect(ws)
    if not ok:
        await ws.close(code=1013)  # try again later
        return
    logger.info("Realtime client connected (%s total)", len(realtime_manager._connections))
    try:
        await ws.send_text(json.dumps({"type": "connection_established", "mode": settings.DATA_MODE.upper()}))
        while True:
            raw = await ws.receive_text()
            try:
                msg = json.loads(raw)
            except (ValueError, TypeError):
                continue
            if msg.get("type") == "ping":
                await ws.send_text(json.dumps({"type": "pong", "server_time": datetime.now(timezone.utc).isoformat()}))
            elif msg.get("type") == "replay":
                for payload in realtime_manager.replay_recent()[-50:]:
                    await ws.send_text(payload)
    except WebSocketDisconnect:
        pass
    except Exception as exc:
        logger.warning("Realtime socket error: %s", exc)
    finally:
        realtime_manager.disconnect(ws)
