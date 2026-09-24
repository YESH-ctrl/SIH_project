"""Simulation control API (Section 33) — authoritative SUMO status."""
from fastapi import APIRouter, HTTPException

from app.core.config import settings
from app.core.logging import logger
from app.simulation.sumo_adapter import sumo_adapter

router = APIRouter(prefix="/simulation", tags=["Simulation (SUMO)"])


@router.get("/status")
async def get_simulation_status():
    """Authoritative status: running=true only while the adapter is active."""
    return sumo_adapter.status()


class SimulationStartRequest:
    pass


@router.post("/start")
async def start_simulation(num_vehicles: int = 20):
    if settings.DATA_MODE == "live":
        raise HTTPException(
            409,
            "Cannot start SUMO in LIVE data mode. Set DATA_MODE=simulation first — "
            "simulation telemetry is never presented as live data.",
        )
    result = await sumo_adapter.start(num_vehicles=num_vehicles)
    if not result.get("ok"):
        raise HTTPException(503, result.get("error", "Simulation failed to start"))
    return sumo_adapter.status() | result


@router.post("/stop")
async def stop_simulation():
    return await sumo_adapter.stop()
