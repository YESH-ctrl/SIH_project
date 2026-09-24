"""Vehicle live-state APIs (Section 28)."""
import time
from datetime import datetime, timezone
from typing import Optional

from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel, Field

from app.core.config import settings
from app.core.logging import logger
from app.telemetry.service import telemetry_service
from app.telemetry.models import TrackingStatus
from app.realtime.manager import realtime_manager

router = APIRouter(prefix="/vehicles", tags=["Vehicles Live"])


def _status_for_vehicle(v) -> str:
    """Compute tracking status from last GPS age (LIVE/DEGRADED/STALE/OFFLINE)."""
    last_ts = getattr(v, "last_gps_timestamp", None)
    if last_ts is None:
        # in-memory fallback objects store epoch seconds
        seen = getattr(v, "last_seen", None)
        if seen is None:
            return "OFFLINE"
        age = time.time() - float(seen)
    else:
        now = datetime.now(timezone.utc)
        ts = last_ts if last_ts.tzinfo else last_ts.replace(tzinfo=timezone.utc)
        age = (now - ts).total_seconds()
    return telemetry_service.tracking_status_for_age(age).value


def _in_memory_vehicles(status: Optional[str], limit: int) -> list:
    """Live in-memory vehicles from the ingestion pipeline (real GPS fixes
    received since process start). Used when the database is unreachable so
    the fleet map keeps showing REAL telemetry — clearly flagged as such;
    never padded with fake vehicles."""
    out = []
    for code, fix in telemetry_service._last_fix.items():
        age = time.time() - fix["ts"].timestamp()
        tracking = telemetry_service.tracking_status_for_age(age).value
        if status and tracking != status:
            continue
        out.append({
            "vehicle_id": code,
            "name": f"Tracker {code}",
            "type": "Van",
            "status": "Active",
            "tracking_status": tracking,
            "lat": fix["lat"],
            "lng": fix["lng"],
            "speed_kmh": fix.get("speed_kmh"),
            "heading_deg": None,
            "last_gps_timestamp": fix["ts"].isoformat(),
            "gps_accuracy_m": None,
            "edge_id": None,
            "route_id": None,
            "eta_s": None,
            "last_reroute_at": None,
            "last_reroute_reason": None,
            "telemetry_source": "in_memory",
            "telemetry_source_mode": "LIVE",
        })
        if len(out) >= limit:
            break
    return out


@router.get("")
async def list_vehicles(
    status: Optional[str] = Query(None, description="Filter by tracking status"),
    limit: int = Query(500, ge=1, le=2000),
):
    """REST initial snapshot of live vehicle state. Data mode explicit."""
    from app.infrastructure.database.session import AsyncSessionLocal
    from sqlalchemy import select
    from app.infrastructure.database.models.vehicle import Vehicle

    vehicles = []
    db_available = True
    try:
        async with AsyncSessionLocal() as db:
            stmt = select(Vehicle).order_by(Vehicle.vehicle_code).limit(limit)
            if status:
                stmt = stmt.where(Vehicle.tracking_status == status)
            rows = (await db.execute(stmt)).scalars().all()
            for v in rows:
                computed_status = _status_for_vehicle(v)
                vehicles.append({
                    "vehicle_id": v.vehicle_code,
                    "name": v.name,
                    "type": v.type,
                    "status": v.status,
                    "tracking_status": computed_status,
                    "lat": float(v.current_lat) if v.current_lat is not None else None,
                    "lng": float(v.current_lng) if v.current_lng is not None else None,
                    "speed_kmh": float(v.current_speed_kmh) if v.current_speed_kmh is not None else None,
                    "heading_deg": float(v.current_heading_deg) if v.current_heading_deg is not None else None,
                    "last_gps_timestamp": v.last_gps_timestamp.isoformat() if v.last_gps_timestamp else None,
                    "gps_accuracy_m": float(v.last_gps_accuracy_m) if v.last_gps_accuracy_m is not None else None,
                    "edge_id": str(v.current_edge_id) if v.current_edge_id else None,
                    "route_id": v.current_route_id,
                    "eta_s": float(v.current_route_eta_s) if v.current_route_eta_s is not None else None,
                    "last_reroute_at": v.last_reroute_at.isoformat() if v.last_reroute_at else None,
                    "last_reroute_reason": v.last_reroute_reason,
                    "telemetry_source": v.telemetry_source,
                    "telemetry_source_mode": v.telemetry_source_mode or "NONE",
                })
    except Exception as exc:
        logger.warning("Vehicle snapshot DB unavailable (%s); serving in-memory live state.", exc)
        db_available = False
        vehicles = _in_memory_vehicles(status, limit)

    return {
        "data_mode": settings.DATA_MODE.upper(),
        "persistence": "database" if db_available else "in_memory",
        "count": len(vehicles),
        "tracking_counts": _tracking_counts(vehicles),
        "vehicles": vehicles,
    }


def _tracking_counts(vehicles):
    counts = {"LIVE": 0, "DEGRADED": 0, "STALE": 0, "OFFLINE": 0}
    for v in vehicles:
        s = v["tracking_status"]
        counts[s] = counts.get(s, 0) + 1
    return counts


@router.get("/{vehicle_id}")
async def get_vehicle(vehicle_id: str):
    """Vehicle details panel source: every value from actual backend state.
    Falls back to in-memory live state when the database is unreachable."""
    from app.infrastructure.database.session import AsyncSessionLocal
    from sqlalchemy import select
    from app.infrastructure.database.models.vehicle import Vehicle
    from app.routing.reroute_engine import reroute_engine
    from app.traffic.engine import traffic_engine
    from app.network.map_matching import osm_map_matcher

    code = vehicle_id.upper()
    row = None
    try:
        async with AsyncSessionLocal() as db:
            row = (await db.execute(
                select(Vehicle).where(Vehicle.vehicle_code == code).limit(1)
            )).scalar_one_or_none()
    except Exception as exc:
        logger.warning("Vehicle detail DB unavailable (%s); serving in-memory state.", exc)

    if row is None:
        # In-memory fallback from the ingestion pipeline (real GPS only).
        fix = telemetry_service._last_fix.get(code)
        if fix is None:
            raise HTTPException(404, f"Vehicle '{vehicle_id}' not found.")
        from app.network.map_matching import osm_map_matcher as _mm
        match = _mm.match(fix["lat"], fix["lng"], vehicle_id=code)
        route_state = reroute_engine.get_route(code)
        return {
            "data_mode": settings.DATA_MODE.upper(),
            "persistence": "in_memory",
            "vehicle_id": code,
            "name": f"Tracker {code}",
            "tracking_status": telemetry_service.tracking_status_for_age(
                time.time() - fix["ts"].timestamp()).value,
            "last_update": fix["ts"].isoformat(),
            "gps_accuracy_m": None,
            "coordinates": {"lat": fix["lat"], "lng": fix["lng"]},
            "speed_kmh": fix.get("speed_kmh"),
            "heading_deg": None,
            "matched_road": ({"edge_id": match.edge_id, "road_name": match.road_name} if match else None),
            "traffic": None,
            "route": {
                "route_id": route_state.route_id if route_state else None,
                "edge_count": len(route_state.edge_ids) if route_state else 0,
                "destination": {
                    "lat": route_state.destination_lat if route_state else None,
                    "lng": route_state.destination_lng if route_state else None,
                },
                "eta_s": route_state.eta_s if route_state else None,
            },
            "last_reroute": {
                "at": datetime.fromtimestamp(route_state.last_reroute_ts, tz=timezone.utc).isoformat() if route_state and route_state.last_reroute_ts else None,
                "reason": None,
            },
            "telemetry_source": "in_memory",
            "telemetry_source_mode": "LIVE",
        }

    status = _status_for_vehicle(row)
    edge_info = None
    traffic = None
    if row.current_edge_id:
        try:
            from sqlalchemy import text
            async with AsyncSessionLocal() as db:
                res = await db.execute(text(
                    "SELECT road_name FROM public.network_edges WHERE id = :eid"
                ), {"eid": str(row.current_edge_id)})
                r = res.first()
                if r:
                    edge_info = {"edge_id": str(row.current_edge_id), "road_name": r[0]}
        except Exception:
            pass
        st = traffic_engine.get_state(str(row.current_edge_id))
        if st is not None:
            traffic = {
                "level": st.level,
                "observed_kmh": st.observed_kmh,
                "free_flow_kmh": st.free_flow_kmh,
                "congestion_ratio": st.congestion_ratio,
                "confidence": st.confidence,
                "sample_count": st.sample_count,
                "source": st.source,
            }

    route_state = reroute_engine.get_route(vehicle_id.upper())
    return {
        "data_mode": settings.DATA_MODE.upper(),
        "vehicle_id": row.vehicle_code,
        "name": row.name,
        "tracking_status": status,
        "last_update": row.last_gps_timestamp.isoformat() if row.last_gps_timestamp else None,
        "gps_accuracy_m": float(row.last_gps_accuracy_m) if row.last_gps_accuracy_m is not None else None,
        "coordinates": {
            "lat": float(row.current_lat) if row.current_lat is not None else None,
            "lng": float(row.current_lng) if row.current_lng is not None else None,
        },
        "speed_kmh": float(row.current_speed_kmh) if row.current_speed_kmh is not None else None,
        "heading_deg": float(row.current_heading_deg) if row.current_heading_deg is not None else None,
        "matched_road": edge_info,
        "traffic": traffic,
        "route": {
            "route_id": route_state.route_id if route_state else row.current_route_id,
            "edge_count": len(route_state.edge_ids) if route_state else 0,
            "destination": {
                "lat": route_state.destination_lat if route_state else None,
                "lng": route_state.destination_lng if route_state else None,
            },
            "eta_s": route_state.eta_s if route_state else (float(row.current_route_eta_s) if row.current_route_eta_s is not None else None),
        },
        "last_reroute": {
            "at": row.last_reroute_at.isoformat() if row.last_reroute_at else None,
            "reason": row.last_reroute_reason,
        },
        "telemetry_source": row.telemetry_source,
        "telemetry_source_mode": row.telemetry_source_mode or "NONE",
    }


@router.get("/{vehicle_id}/positions")
async def get_vehicle_positions(
    vehicle_id: str,
    limit: int = Query(200, ge=1, le=1000),
):
    """GPS position history from vehicle_positions (real telemetry only).
    Falls back to the in-memory trajectory when the database is unreachable."""
    code = vehicle_id.upper()
    try:
        from app.telemetry.repository import TelemetryRepository
        rows = await TelemetryRepository().get_positions(code, limit=limit)
        return {
            "vehicle_id": code,
            "persistence": "database",
            "count": len(rows),
            "positions": [
                {
                    "timestamp": r.timestamp.isoformat(),
                    "lat": r.latitude,
                    "lng": r.longitude,
                    "speed_kmh": r.speed_kmh,
                    "heading_deg": r.heading_deg,
                    "accuracy_m": r.accuracy_m,
                    "source": r.source,
                    "matched_edge_id": r.matched_edge_id,
                    "match_confidence": r.match_confidence,
                }
                for r in rows
            ],
        }
    except Exception as exc:
        logger.warning("Position history DB unavailable (%s); serving in-memory trajectory.", exc)
        # In-memory fallback: the last accepted fixes per vehicle (real GPS only)
        fix = telemetry_service._last_fix.get(code)
        if fix is None:
            return {"vehicle_id": code, "persistence": "in_memory", "count": 0, "positions": []}
        return {
            "vehicle_id": code,
            "persistence": "in_memory",
            "count": 1,
            "positions": [{
                "timestamp": fix["ts"].isoformat(),
                "lat": fix["lat"],
                "lng": fix["lng"],
                "speed_kmh": fix.get("speed_kmh"),
                "heading_deg": None,
                "accuracy_m": None,
                "source": "in_memory",
                "matched_edge_id": None,
                "match_confidence": None,
            }],
        }


class DestinationRequest(BaseModel):
    latitude: float = Field(..., ge=-90, le=90)
    longitude: float = Field(..., ge=-180, le=180)
    name: str = ""


@router.post("/{vehicle_id}/destination")
async def set_destination(vehicle_id: str, req: DestinationRequest):
    """Assign a destination: builds the live route and starts tracking it."""
    from app.routing.dynamic_graph import dynamic_routing_graph
    from app.routing.reroute_engine import reroute_engine, VehicleRouteState

    dg = dynamic_routing_graph
    if not dg.ensure_graph():
        raise HTTPException(503, "Routing graph not ready (OSM network import required).")

    src_node = None
    last = telemetry_service._last_fix.get(vehicle_id.upper())
    if last:
        src_node = dg.nearest_node(last["lat"], last["lng"])
    if src_node is None:
        src_node = dg.nearest_node(req.latitude, req.longitude)
    dst_node = dg.nearest_node(req.latitude, req.longitude)
    if dst_node is None:
        raise HTTPException(422, "Destination could not be snapped to the road network.")

    route = dg.route(src_node, dst_node)
    if route is None:
        raise HTTPException(422, "No route found between vehicle position and destination.")

    vehicle_code = vehicle_id.upper()
    route_id = f"route_{vehicle_code}_{int(time.time())}"
    st = VehicleRouteState(
        route_id=route_id,
        edge_ids=route["edge_ids"],
        geometry=route["geometry"],
        eta_s=route["travel_time_seconds"],
        destination_lat=req.latitude,
        destination_lng=req.longitude,
        destination_name=req.name,
    )
    reroute_engine.set_route(vehicle_code, st)

    await realtime_manager.broadcast({
        "type": "route_update",
        "vehicle_id": vehicle_code,
        "route_id": route_id,
        "reason": "DESTINATION_SET",
        "eta_seconds": route["travel_time_seconds"],
        "polyline": route["geometry"]["coordinates"],
        "edge_ids": route["edge_ids"],
    })
    return {
        "vehicle_id": vehicle_code,
        "route_id": route_id,
        "distance_m": route["distance_meters"],
        "eta_s": route["travel_time_seconds"],
        "edge_count": len(route["edge_ids"]),
    }


class RerouteRequest(BaseModel):
    reason: str = "DISPATCHER_REQUESTED"


@router.post("/{vehicle_id}/reroute")
async def force_reroute(vehicle_id: str, req: RerouteRequest):
    """Dispatcher-triggered immediate reroute (QPSO evaluates alternatives)."""
    from app.routing.dynamic_graph import dynamic_routing_graph
    from app.routing.reroute_engine import reroute_engine
    from app.routing.qpso_selector import qpso_selector

    vehicle_code = vehicle_id.upper()
    st = reroute_engine.get_route(vehicle_code)
    if st is None or not st.edge_ids:
        raise HTTPException(409, "Vehicle has no active route to reroute.")

    dg = dynamic_routing_graph
    if not dg.ensure_graph():
        raise HTTPException(503, "Routing graph not ready.")

    last = telemetry_service._last_fix.get(vehicle_code)
    if last is None:
        raise HTTPException(409, "No recent telemetry for this vehicle; cannot reroute.")
    src_node = dg.nearest_node(last["lat"], last["lng"])
    dest_node = st.edge_ids[-1].split("->")[-1]

    candidates = qpso_selector.build_candidates(dg, src_node, dest_node)
    if not candidates:
        raise HTTPException(503, "No alternative routes available.")
    selection = qpso_selector.select(candidates, current_route_edge_ids=st.edge_ids)

    current_eta = sum(
        float(dg.graph[u][v].get("travel_time", 60.0))
        for eid in st.edge_ids for u, v in [eid.split("->", 1)] if dg.graph.has_edge(u, v)
    )
    new_eta = sum(
        float(dg.graph[u][v].get("travel_time", 60.0))
        for eid in selection.best.edge_ids for u, v in [eid.split("->", 1)] if dg.graph.has_edge(u, v)
    )
    decision = reroute_engine.evaluate(
        vehicle_id=vehicle_code,
        current_eta_s=current_eta,
        candidate_eta_s=new_eta,
        immediate_reason=req.reason,
    )
    if not decision.should_reroute:
        return {"rerouted": False, "reason": decision.reason}

    route_id = f"route_{vehicle_code}_{int(time.time())}"
    event = await reroute_engine.commit_reroute(
        vehicle_id=vehicle_code,
        vehicle_code=vehicle_code,
        decision=decision,
        new_route_id=route_id,
        new_edge_ids=selection.best.edge_ids,
        new_geometry=selection.best.geometry,
    )
    return {"rerouted": True, "route_id": route_id, "event": event}
