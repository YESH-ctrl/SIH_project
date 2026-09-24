from fastapi import APIRouter, HTTPException, Query
from typing import Optional

from app.optimization.models import (
    OptimizationRunRequestDTO,
    OptimizationRunResponseDTO,
    IncidentSimulationRequestDTO,
    IncidentSimulationResponseDTO,
    RerouteRequestDTO,
    RerouteResponseDTO,
)
from app.optimization.service import OptimizationService
from app.optimization.demo_data import get_raipur_demo_dataset

router = APIRouter(prefix="/optimization", tags=["Optimization"])
opt_service = OptimizationService()

@router.post("/demo", response_model=OptimizationRunResponseDTO)
def run_optimization_demo(
    population_size: int = Query(20, ge=5, le=100),
    iterations: int = Query(50, ge=5, le=300),
    seed: int = Query(42)
):
    """
    Run baseline VRP vs QPSO Optimization on the Raipur urban road network.
    Returns comparison metrics, dynamic percentage improvement, and multi-vehicle GeoJSON routes.
    """
    try:
        req = OptimizationRunRequestDTO(
            population_size=population_size,
            iterations=iterations,
            seed=seed
        )
        return opt_service.run_qpso_demo(req)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Optimization failed: {str(e)}")

@router.post("/run", response_model=OptimizationRunResponseDTO)
def run_custom_optimization(request: OptimizationRunRequestDTO):
    """
    Run custom QPSO optimization with specific parameters.
    """
    try:
        return opt_service.run_qpso_demo(request)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Custom optimization failed: {str(e)}")

@router.get("/demo-dataset")
def get_demo_dataset():
    """
    Retrieve preconfigured Raipur VRP demo dataset (Depot, Delivery Points, Vehicles).
    """
    depot, delivery_points, vehicles = get_raipur_demo_dataset()
    return {
        "depot": depot,
        "delivery_points": delivery_points,
        "vehicles": vehicles
    }

@router.post("/simulate-incident", response_model=IncidentSimulationResponseDTO)
def simulate_incident(request: Optional[IncidentSimulationRequestDTO] = None):
    """
    Simulate a traffic incident / road blockage along an active vehicle route.
    """
    try:
        return opt_service.simulate_incident(request)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Incident simulation failed: {str(e)}")

@router.post("/reroute", response_model=RerouteResponseDTO)
def reroute_vehicle(request: RerouteRequestDTO):
    """
    Execute Q-FLOW dynamic re-routing for affected vehicles around a blocked edge.
    """
    try:
        return opt_service.reroute_vehicle(request)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Rerouting failed: {str(e)}")

