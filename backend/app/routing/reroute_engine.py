"""Intelligent rerouting engine.

Rules (configurable via settings):
  reroute when new_route_eta < current_route_eta - REROUTE_MIN_ETA_GAIN_S
    AND improvement% > REROUTE_MIN_IMPROVEMENT_PCT
    AND vehicle not immediately at a maneuver
    AND vehicle not rerouted within REROUTE_COOLDOWN_S

Immediate reroute (bypasses thresholds): confirmed road closure, severe
accident, blocked edge on current route, vehicle off-route, major sudden
congestion. Every reroute is logged to reroute_log + broadcast as route_update.
"""
import time
from dataclasses import dataclass, field
from datetime import datetime, timezone
from typing import Dict, List, Optional, Tuple

from app.core.config import settings
from app.core.logging import logger


@dataclass
class VehicleRouteState:
    """Server-side per-vehicle route memory."""
    route_id: str
    edge_ids: List[str]
    geometry: dict
    eta_s: float
    destination_node: Optional[str] = None
    destination_lat: Optional[float] = None
    destination_lng: Optional[float] = None
    last_reroute_ts: float = 0.0
    optimization_run_id: Optional[str] = None


@dataclass
class RerouteDecision:
    vehicle_id: str
    should_reroute: bool
    reason: str = ""
    immediate: bool = False
    old_eta_s: Optional[float] = None
    new_eta_s: Optional[float] = None
    improvement_s: Optional[float] = None
    improvement_pct: Optional[float] = None


class RerouteEngine:
    """Threshold-guarded rerouting decisions with cooldowns."""

    def __init__(self):
        self._vehicle_routes: Dict[str, VehicleRouteState] = {}

    # ------------------------------------------------------------- state mgmt
    def set_route(self, vehicle_id: str, state: VehicleRouteState) -> None:
        self._vehicle_routes[vehicle_id] = state

    def get_route(self, vehicle_id: str) -> Optional[VehicleRouteState]:
        return self._vehicle_routes.get(vehicle_id)

    def set_destination(self, vehicle_id: str, lat: float, lng: float, name: str = "") -> Optional[VehicleRouteState]:
        st = self._vehicle_routes.get(vehicle_id)
        if st is None:
            return None
        st.destination_lat = lat
        st.destination_lng = lng
        st.destination_name = name
        return st

    # ------------------------------------------------------------ decisions
    def evaluate(
        self,
        vehicle_id: str,
        current_eta_s: float,
        candidate_eta_s: float,
        at_maneuver: bool = False,
        immediate_reason: Optional[str] = None,
        now: Optional[float] = None,
    ) -> RerouteDecision:
        now = now if now is not None else time.time()
        st = self._vehicle_routes.get(vehicle_id)
        last_reroute = st.last_reroute_ts if st else 0.0

        # Immediate triggers override thresholds (still respect a short cooldown
        # of 5 s to avoid event storms).
        if immediate_reason:
            if now - last_reroute >= 5.0:
                return RerouteDecision(
                    vehicle_id=vehicle_id, should_reroute=True,
                    reason=immediate_reason, immediate=True,
                    old_eta_s=current_eta_s, new_eta_s=candidate_eta_s,
                )
            return RerouteDecision(vehicle_id=vehicle_id, should_reroute=False,
                                   reason="immediate trigger but cooldown active")

        improvement_s = current_eta_s - candidate_eta_s
        improvement_pct = (improvement_s / current_eta_s * 100.0) if current_eta_s > 0 else 0.0

        checks = {
            "eta_gain": improvement_s >= settings.REROUTE_MIN_ETA_GAIN_S,
            "improvement_pct": improvement_pct >= settings.REROUTE_MIN_IMPROVEMENT_PCT,
            "not_at_maneuver": not at_maneuver,
            "cooldown": (now - last_reroute) >= settings.REROUTE_COOLDOWN_S,
        }
        if all(checks.values()):
            return RerouteDecision(
                vehicle_id=vehicle_id, should_reroute=True,
                reason="BETTER_ROUTE_FOUND", immediate=False,
                old_eta_s=current_eta_s, new_eta_s=candidate_eta_s,
                improvement_s=round(improvement_s, 1),
                improvement_pct=round(improvement_pct, 2),
            )
        failed = [k for k, ok in checks.items() if not ok]
        return RerouteDecision(vehicle_id=vehicle_id, should_reroute=False,
                               reason="thresholds not met: " + ",".join(failed))

    # ------------------------------------------------------------- execution
    async def commit_reroute(
        self,
        vehicle_id: str,
        vehicle_code: str,
        decision: RerouteDecision,
        new_route_id: str,
        new_edge_ids: List[str],
        new_geometry: dict,
        optimization_run_id: Optional[str] = None,
        organization_id: Optional[str] = None,
    ) -> dict:
        """Record the reroute, update vehicle route memory, broadcast route_update."""
        st = self._vehicle_routes.get(vehicle_id)
        old_route_id = st.route_id if st else None
        old_summary = {"edge_count": len(st.edge_ids)} if st else None

        event = {
            "type": "route_update",
            "vehicle_id": vehicle_code,
            "route_id": new_route_id,
            "reason": decision.reason,
            "immediate": decision.immediate,
            "eta_seconds": decision.new_eta_s,
            "old_eta_seconds": decision.old_eta_s,
            "eta_improvement_seconds": decision.improvement_s,
            "eta_improvement_pct": decision.improvement_pct,
            "polyline": new_geometry.get("coordinates", []),
            "edge_ids": new_edge_ids,
            "optimization_run_id": optimization_run_id,
            "timestamp": datetime.now(timezone.utc).isoformat(),
        }

        # persist
        try:
            from app.routing.repository import RerouteLogRepository
            repo = RerouteLogRepository()
            await repo.log_reroute(
                vehicle_code=vehicle_code,
                old_route_id=old_route_id,
                new_route_id=new_route_id,
                old_eta_s=decision.old_eta_s,
                new_eta_s=decision.new_eta_s,
                improvement_s=decision.improvement_s,
                improvement_pct=decision.improvement_pct,
                reason=decision.reason,
                optimization_run_id=optimization_run_id,
                organization_id=organization_id,
                details={"immediate": decision.immediate, "old_summary": old_summary},
            )
        except Exception as exc:
            logger.warning("reroute_log persist failed: %s", exc)

        # update memory
        if st:
            st.route_id = new_route_id
            st.edge_ids = new_edge_ids
            st.eta_s = decision.new_eta_s or st.eta_s
            st.last_reroute_ts = time.time()
            st.optimization_run_id = optimization_run_id

        # broadcast
        try:
            from app.realtime.manager import realtime_manager
            await realtime_manager.broadcast(event)
        except Exception as exc:
            logger.warning("route_update broadcast failed: %s", exc)

        logger.info("REROUTE vehicle=%s reason=%s immediate=%s old_eta=%.0fs new_eta=%.0fs",
                    vehicle_code, decision.reason, decision.immediate,
                    decision.old_eta_s or 0, decision.new_eta_s or 0)
        return event

    def stats(self) -> dict:
        return {"vehicles_with_routes": len(self._vehicle_routes)}


reroute_engine = RerouteEngine()
