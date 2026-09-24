from typing import List, Dict, Any, Optional
from pydantic import BaseModel, Field


class RoleDistributionItem(BaseModel):
    role: str
    count: int
    color: str


class AdminDashboardResponse(BaseModel):
    organization_name: str
    total_vehicles: int
    active_vehicles: int
    total_delivery_points: int
    active_routes: int
    avg_utilization: float
    network_congestion: float
    completed_deliveries_today: int
    system_health_percent: float
    role_distribution: List[RoleDistributionItem]
    fleet_health: Dict[str, int]
    operations_summary: Dict[str, Any]
    network_health: Dict[str, Any]
    users_overview: Dict[str, Any]
    recent_activity: List[Dict[str, str]]


class PriorityActionItem(BaseModel):
    id: str
    title: str
    urgency: str
    count: int
    action_label: str
    target_tab: str


class IncidentSummary(BaseModel):
    code: str
    location: str
    delay_increase_percent: float
    affected_vehicles: int
    affected_routes: int
    severity: str


class OptimizationSummary(BaseModel):
    run_id: str
    algorithm: str
    vehicle_count: int
    stop_count: int
    progress_percent: float
    best_fitness: float
    status: str
    last_run_time: str


class OperationsDashboardResponse(BaseModel):
    active_vehicles: int
    active_routes: int
    delivery_stops: int
    network_congestion: float
    avg_speed_kmh: float
    on_time_delivery_percent: float
    delayed_routes_count: int
    optimization_status: str
    operational_health: Dict[str, int]
    latest_incident: IncidentSummary
    current_optimization: OptimizationSummary
    priority_actions: List[PriorityActionItem]


class CriticalIncidentItem(BaseModel):
    id: str
    code: str
    location: str
    delay_text: str
    vehicles_affected: int
    severity: str


class ActiveRouteItem(BaseModel):
    id: str
    route_code: str
    vehicle_code: str
    driver: str
    next_stop: str
    eta: str
    delay_min: int
    status: str


class ActivityFeedItem(BaseModel):
    id: str
    time: str
    text: str
    category: str


class DispatcherDashboardResponse(BaseModel):
    vehicles_online: int
    vehicles_moving: int
    vehicles_idle: int
    active_routes: int
    delayed_routes: int
    critical_incidents_count: int
    critical_incidents: List[CriticalIncidentItem]
    active_routes_list: List[ActiveRouteItem]
    delivery_exceptions: List[Dict[str, str]]
    realtime_activity_feed: List[ActivityFeedItem]


class AlgorithmBenchmarkItem(BaseModel):
    algorithm: str
    best_fitness: float
    avg_fitness: float
    travel_time_saved_percent: float
    avg_distance_km: float
    avg_runtime_sec: float
    convergence_rate: str


class QpsoAnalytics(BaseModel):
    convergence_curve: List[Dict[str, Any]]
    best_fitness: float
    population_size: int
    iterations: int
    runtime_sec: float


class AnalystDashboardResponse(BaseModel):
    avg_travel_time_min: float
    avg_route_distance_km: float
    on_time_delivery_percent: float
    avg_network_congestion_percent: float
    fleet_utilization_percent: float
    optimization_improvement_percent: float
    avg_optimization_time_sec: float
    reoptimization_count: int
    algorithm_benchmarks: List[AlgorithmBenchmarkItem]
    qpso_analytics: QpsoAnalytics
    traffic_analytics: Dict[str, Any]
    optimization_history: List[Dict[str, Any]]
