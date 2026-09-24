"""Live traffic + incident + system status APIs."""
import time
from typing import Optional

from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel, Field

from app.core.config import settings
from app.core.logging import logger
from app.traffic.engine import traffic_engine
from app.incidents.engine import incident_engine, INCIDENT_STATUSES
from app.network.map_matching import osm_map_matcher
from app.routing.dynamic_graph import dynamic_routing_graph
from app.core.pipeline import pipeline_orchestrator
from app.realtime.manager import realtime_manager

router = APIRouter(tags=["Live Traffic & Incidents"])


# ------------------------------------------------------------------ traffic
@router.get("/traffic/edges")
async def get_traffic_edges(
    level: Optional[str] = Query(None, description="Filter by congestion level"),
    limit: int = Query(1000, ge=1, le=5000),
):
    """Live per-edge traffic state from fleet telemetry / providers.
    Edges without sufficient observations are UNKNOWN — never fabricated."""
    states = traffic_engine.all_states()
    out = []
    for s in states:
        if level and s.level != level.upper():
            continue
        edge = osm_map_matcher.get_edge(s.edge_id)
        out.append({
            "edge_id": s.edge_id,
            "network_id": s.network_id,
            "road_name": edge.road_name if edge else None,
            "free_flow_speed_kmh": s.free_flow_kmh,
            "observed_speed_kmh": s.observed_kmh,
            "sample_count": s.sample_count,
            "speed_confidence": s.confidence,
            "congestion_ratio": s.congestion_ratio,
            "level": s.level,
            "travel_time_seconds": s.travel_time_s,
            "source": s.source,
            "updated_at": s.updated_at.isoformat(),
            "geometry": {"coordinates": [[p[1], p[0]] for p in edge.polyline]} if edge else None,
        })
        if len(out) >= limit:
            break
    return {
        "data_mode": settings.DATA_MODE.upper(),
        "provider": (settings.TRAFFIC_PROVIDER or "none").lower(),
        "count": len(out),
        "edges": out,
    }


# ----------------------------------------------------------------- incidents
class IncidentCreateRequest(BaseModel):
    type: str = Field(..., description="ACCIDENT | ROADWORK | CONGESTION | WEATHER | CLOSURE")
    severity: str = Field("MODERATE", description="LOW | MODERATE | HIGH | SEVERE")
    latitude: float = Field(..., ge=-90, le=90)
    longitude: float = Field(..., ge=-180, le=180)
    title: str = ""
    ttl_s: Optional[float] = None


@router.get("/incidents")
async def get_incidents():
    """All non-resolved incidents (visible while ACTIVE; removed only when resolved/expired)."""
    incidents = incident_engine.active_incidents()
    return {
        "data_mode": settings.DATA_MODE.upper(),
        "count": len(incidents),
        "incidents": [i.to_dict() for i in incidents],
    }


@router.post("/incidents", status_code=201)
async def create_incident(req: IncidentCreateRequest):
    """Manual dispatcher/admin incident. Edge mapping is dynamic from coordinates."""
    inc = await incident_engine.create_incident(
        type_=req.type.upper(),
        severity=req.severity.upper(),
        latitude=req.latitude,
        longitude=req.longitude,
        source="MANUAL",
        confidence=1.0,
        title=req.title,
        ttl_s=req.ttl_s,
        status="CONFIRMED",
    )
    return inc.to_dict()


@router.post("/incidents/{incident_id}/confirm")
async def confirm_incident(incident_id: str):
    inc = await incident_engine.confirm(incident_id)
    if inc is None:
        raise HTTPException(404, "Incident not found.")
    return inc.to_dict()


@router.post("/incidents/{incident_id}/resolve")
async def resolve_incident(incident_id: str, note: str = ""):
    inc = await incident_engine.resolve(incident_id, note or None)
    if inc is None:
        raise HTTPException(404, "Incident not found.")
    return inc.to_dict()


# -------------------------------------------------------------- optimization
@router.get("/optimization/reroutes")
async def get_reroute_log(limit: int = Query(100, ge=1, le=500)):
    """Reroute decision log with measured ETAs (Section 14)."""
    from app.infrastructure.database.session import AsyncSessionLocal
    from sqlalchemy import select
    from app.infrastructure.database.models.traffic_live import RerouteLog

    try:
        async with AsyncSessionLocal() as db:
            rows = (await db.execute(
                select(RerouteLog).order_by(RerouteLog.created_at.desc()).limit(limit)
            )).scalars().all()
        return {
            "count": len(rows),
            "reroutes": [
                {
                    "id": str(r.id),
                    "vehicle_code": r.vehicle_code,
                    "old_route_id": r.old_route_id,
                    "new_route_id": r.new_route_id,
                    "old_eta_s": float(r.old_eta_s) if r.old_eta_s is not None else None,
                    "new_eta_s": float(r.new_eta_s) if r.new_eta_s is not None else None,
                    "eta_improvement_s": float(r.eta_improvement_s) if r.eta_improvement_s is not None else None,
                    "eta_improvement_pct": float(r.eta_improvement_pct) if r.eta_improvement_pct is not None else None,
                    "reason": r.reason,
                    "created_at": r.created_at.isoformat() if r.created_at else None,
                }
                for r in rows
            ],
        }
    except Exception as exc:
        logger.error("Reroute log query failed: %s", exc)
        return {"count": 0, "reroutes": [], "error": "Database unavailable."}


@router.get("/optimization/runs")
async def get_optimization_runs(limit: int = Query(50, ge=1, le=200)):
    """QPSO experimental metrics (Section 35) from stored runs."""
    from app.infrastructure.database.session import AsyncSessionLocal
    from sqlalchemy import select
    from app.infrastructure.database.models.optimization import OptimizationRun

    try:
        async with AsyncSessionLocal() as db:
            rows = (await db.execute(
                select(OptimizationRun).order_by(OptimizationRun.created_at.desc()).limit(limit)
            )).scalars().all()
        return {
            "count": len(rows),
            "runs": [
                {
                    "optimization_id": r.optimization_id or r.run_code,
                    "created_at": r.created_at.isoformat() if r.created_at else None,
                    "algorithm": r.algorithm,
                    "vehicles_considered": r.vehicles_considered,
                    "iterations": r.iterations,
                    "population_size": r.population_size,
                    "best_cost": float(r.best_cost) if r.best_cost is not None else None,
                    "computation_time_ms": float(r.computation_time_ms) if r.computation_time_ms is not None else None,
                    "routes_changed": r.routes_changed,
                    "baseline_total_time_s": float(r.baseline_total_time_s) if r.baseline_total_time_s else None,
                    "optimized_total_time_s": float(r.optimized_total_time_s) if r.optimized_total_time_s else None,
                    "improvement_pct": float(r.improvement_pct) if r.improvement_pct is not None else None,
                    "data_mode": r.data_mode,
                }
                for r in rows
            ],
        }
    except Exception as exc:
        logger.error("Optimization runs query failed: %s", exc)
        return {"count": 0, "runs": [], "error": "Database unavailable."}


# -------------------------------------------------------------- system status
@router.get("/system/status")
async def get_system_status():
    """Authoritative health of every subsystem (Section 21)."""
    from app.infrastructure.database.session import AsyncSessionLocal
    from sqlalchemy import text

    # Database
    db_ok = False
    try:
        async with AsyncSessionLocal() as db:
            await db.execute(text("SELECT 1"))
        db_ok = True
    except Exception:
        db_ok = False

    # Last telemetry timestamp + connected vehicle count
    last_telemetry = None
    vehicle_count = 0
    live_count = 0
    try:
        from app.telemetry.service import telemetry_service as ts
        now = time.time()
        for code, seen in ts._last_fix.items():
            vehicle_count += 1
            if now - seen.timestamp().timestamp() < settings.STALE_DEGRADED_S:
                live_count += 1
        if ts._last_fix:
            last_ts = max(f["ts"] for f in ts._last_fix.values())
            last_telemetry = last_ts.isoformat()
    except Exception:
        pass

    matcher_ready = bool(osm_map_matcher._edges)
    graph_ready = dynamic_routing_graph.graph is not None
    sim_status = None
    try:
        from app.simulation.sumo_adapter import sumo_adapter
        sim_status = sumo_adapter.status()
    except Exception:
        pass

    return {
        "data_mode": settings.DATA_MODE.upper(),
        "subsystems": {
            "database": {"ok": db_ok},
            "realtime": {"ok": True, **realtime_manager.stats()},
            "gps_ingestion": {
                "ok": True,
                "connected_vehicles": vehicle_count,
                "live_vehicles": live_count,
                "last_telemetry": last_telemetry,
            },
            "map_matching": {"ok": matcher_ready, **osm_map_matcher.stats()},
            "traffic_engine": traffic_engine.stats(),
            "routing": {"ok": graph_ready, **dynamic_routing_graph.stats()},
            "optimizer": {"ok": True, "algorithm": "Discrete QPSO (live route selection)"},
            "sumo": sim_status,
            "incidents": incident_engine.stats(),
            "pipeline": pipeline_orchestrator.stats(),
        },
        "traffic_provider": {
            "provider": (settings.TRAFFIC_PROVIDER or "none").lower(),
            "configured": bool(settings.TRAFFIC_API_KEY) if settings.TRAFFIC_PROVIDER != "none" else True,
        },
    }
