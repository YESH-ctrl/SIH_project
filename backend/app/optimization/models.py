from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field

class DeliveryPointDTO(BaseModel):
    id: str
    name: str
    latitude: float
    longitude: float
    demand: int
    node_id: Optional[str] = None
    service_time_seconds: int = 300

class VehicleSpecDTO(BaseModel):
    id: str
    name: str
    capacity: int
    start_depot_id: str
    end_depot_id: Optional[str] = None
    color: str = "#00f0ff"

class DepotDTO(BaseModel):
    id: str
    name: str
    latitude: float
    longitude: float
    node_id: Optional[str] = None

class StopDetailDTO(BaseModel):
    stop_index: int
    delivery_point_id: str
    name: str
    node_id: str
    latitude: float
    longitude: float
    demand: int
    arrival_time_seconds: float
    distance_from_prev_meters: float

class VehicleRouteResultDTO(BaseModel):
    vehicle_id: str
    vehicle_name: str
    color: str
    stops: List[StopDetailDTO]
    geometry: Dict[str, Any]  # GeoJSON LineString
    distance_meters: float
    travel_time_seconds: float
    total_demand: int
    capacity: int
    utilization_pct: float

class SolutionMetricsDTO(BaseModel):
    total_distance_km: float
    total_travel_time_min: float
    vehicles_used: int
    total_demand_delivered: int
    capacity_violations: int
    fitness_score: float

class ConvergencePointDTO(BaseModel):
    iteration: int
    best_fitness: float
    mean_fitness: float

class OptimizationRunResponseDTO(BaseModel):
    run_id: str
    network_id: str
    status: str
    algorithm: str
    population_size: int
    iterations: int
    runtime_ms: float
    baseline_metrics: SolutionMetricsDTO
    qpso_metrics: SolutionMetricsDTO
    distance_improvement_pct: float
    time_improvement_pct: float
    fitness_improvement_pct: float
    qpso_routes: List[VehicleRouteResultDTO]
    baseline_routes: List[VehicleRouteResultDTO]
    convergence_history: List[ConvergencePointDTO]
    depot: DepotDTO
    delivery_points: List[DeliveryPointDTO]

class OptimizationRunRequestDTO(BaseModel):
    network_id: str = "9cb256c8-6c5a-4f05-8259-e8b887334fa2"
    population_size: int = 30
    iterations: int = 100
    beta_quantum: float = 0.75
    alpha_time_weight: float = 1.0
    beta_dist_weight: float = 0.5
    seed: Optional[int] = 42

class IncidentSimulationRequestDTO(BaseModel):
    network_id: str = "9cb256c8-6c5a-4f05-8259-e8b887334fa2"
    vehicle_id: str = "veh_01"

class IncidentSimulationResponseDTO(BaseModel):
    incident_id: str
    network_id: str
    edge_id: str
    road_name: str
    latitude: float
    longitude: float
    severity: str
    affected_vehicle_id: str
    affected_route_id: str
    delay_increase_pct: float
    status: str

class RerouteRequestDTO(BaseModel):
    network_id: str = "9cb256c8-6c5a-4f05-8259-e8b887334fa2"
    incident_id: str
    affected_edge_id: str
    affected_vehicle_id: str = "veh_01"


class RerouteResponseDTO(BaseModel):
    reroute_id: str
    status: str
    affected_vehicle_id: str
    original_route: VehicleRouteResultDTO
    rerouted_route: VehicleRouteResultDTO
    original_travel_time_min: float
    new_travel_time_min: float
    time_delay_saved_min: float
    reroute_runtime_ms: float
    avoided_edge_id: str

