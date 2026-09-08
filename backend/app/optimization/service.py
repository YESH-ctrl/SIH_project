import time
import uuid
from typing import Dict, Any, Optional

from app.network.graph_builder import build_osm_road_network
from app.optimization.demo_data import get_raipur_demo_dataset
from app.optimization.discrete_qpso import VRPEvaluator, BaselineVRPSolver, DiscreteQPSOSolver
from app.optimization.models import (
    OptimizationRunRequestDTO,
    OptimizationRunResponseDTO,
    IncidentSimulationRequestDTO,
    IncidentSimulationResponseDTO,
    RerouteRequestDTO,
    RerouteResponseDTO,
)

class OptimizationService:
    """
    Orchestrates VRP & QPSO Optimization runs over OpenStreetMap road network graphs.
    """
    _graph_cache: Dict[str, Any] = {}

    def run_qpso_demo(self, request: Optional[OptimizationRunRequestDTO] = None) -> OptimizationRunResponseDTO:
        if request is None:
            request = OptimizationRunRequestDTO()

        start_time = time.time()

        # Load or retrieve cached graph
        net_key = request.network_id
        if net_key not in self._graph_cache:
            self._graph_cache[net_key] = build_osm_road_network("Raipur, India")
        
        G = self._graph_cache[net_key]

        # Get deterministic demo dataset
        depot, delivery_points, vehicles = get_raipur_demo_dataset()

        # Build evaluator & matrices
        evaluator = VRPEvaluator(G, request.network_id, depot, delivery_points)

        # 1. Baseline Greedy VRP Solution
        baseline_solver = BaselineVRPSolver(evaluator, vehicles)
        baseline_metrics, baseline_routes = baseline_solver.solve()

        # 2. QPSO Quantum-Inspired Solution
        qpso_solver = DiscreteQPSOSolver(
            evaluator=evaluator,
            vehicles=vehicles,
            pop_size=request.population_size,
            iterations=request.iterations,
            beta_quantum=request.beta_quantum,
            seed=request.seed
        )
        qpso_metrics, qpso_routes, convergence = qpso_solver.solve()

        elapsed_ms = round((time.time() - start_time) * 1000.0, 2)

        # Calculate exact measured percentage improvements (Section 9 formula)
        dist_imp = 0.0
        if baseline_metrics.total_distance_km > 0:
            dist_imp = round(
                ((baseline_metrics.total_distance_km - qpso_metrics.total_distance_km) / baseline_metrics.total_distance_km) * 100.0,
                2
            )

        time_imp = 0.0
        if baseline_metrics.total_travel_time_min > 0:
            time_imp = round(
                ((baseline_metrics.total_travel_time_min - qpso_metrics.total_travel_time_min) / baseline_metrics.total_travel_time_min) * 100.0,
                2
            )

        fit_imp = 0.0
        if baseline_metrics.fitness_score > 0:
            fit_imp = round(
                ((baseline_metrics.fitness_score - qpso_metrics.fitness_score) / baseline_metrics.fitness_score) * 100.0,
                2
            )

        run_id = f"opt_{uuid.uuid4().hex[:12]}"

        return OptimizationRunResponseDTO(
            run_id=run_id,
            network_id=request.network_id,
            status="COMPLETED",
            algorithm="Discrete Quantum-Inspired Particle Swarm Optimization (QPSO)",
            population_size=request.population_size,
            iterations=request.iterations,
            runtime_ms=elapsed_ms,
            baseline_metrics=baseline_metrics,
            qpso_metrics=qpso_metrics,
            distance_improvement_pct=dist_imp,
            time_improvement_pct=time_imp,
            fitness_improvement_pct=fit_imp,
            qpso_routes=qpso_routes,
            baseline_routes=baseline_routes,
            convergence_history=convergence,
            depot=depot,
            delivery_points=delivery_points
        )

    def simulate_incident(self, request: Optional[IncidentSimulationRequestDTO] = None) -> IncidentSimulationResponseDTO:
        if request is None:
            request = IncidentSimulationRequestDTO()

        net_key = request.network_id
        if net_key not in self._graph_cache:
            self._graph_cache[net_key] = build_osm_road_network("Raipur, India")
        G = self._graph_cache[net_key]

        depot, delivery_points, vehicles = get_raipur_demo_dataset()
        evaluator = VRPEvaluator(G, request.network_id, depot, delivery_points)
        baseline_solver = BaselineVRPSolver(evaluator, vehicles)
        _, baseline_routes = baseline_solver.solve()

        affected_veh = request.vehicle_id
        target_route = next((r for r in baseline_routes if r.vehicle_id == affected_veh), baseline_routes[0])
        
        edge_id = "edge_e17"
        road_name = "Expressway E17 / Great Eastern Rd"
        lat, lng = 21.2514, 81.6296

        if target_route.stops and len(target_route.stops) >= 2:
            s1 = target_route.stops[1]
            lat, lng = s1.latitude, s1.longitude
            edge_id = f"edge_{s1.node_id}"

        return IncidentSimulationResponseDTO(
            incident_id=f"inc_{uuid.uuid4().hex[:8]}",
            network_id=request.network_id,
            edge_id=edge_id,
            road_name=road_name,
            latitude=lat,
            longitude=lng,
            severity="SEVERE_CONGESTION",
            affected_vehicle_id=target_route.vehicle_id,
            affected_route_id=f"route_{target_route.vehicle_id}",
            delay_increase_pct=78.0,
            status="ACTIVE"
        )

    def reroute_vehicle(self, request: RerouteRequestDTO) -> RerouteResponseDTO:
        start_time = time.time()
        net_key = request.network_id
        if net_key not in self._graph_cache:
            self._graph_cache[net_key] = build_osm_road_network("Raipur, India")
        
        G = self._graph_cache[net_key].copy()

        depot, delivery_points, vehicles = get_raipur_demo_dataset()
        
        orig_evaluator = VRPEvaluator(self._graph_cache[net_key], request.network_id, depot, delivery_points)
        baseline_solver = BaselineVRPSolver(orig_evaluator, vehicles)
        _, orig_routes = baseline_solver.solve()
        orig_veh_route = next((r for r in orig_routes if r.vehicle_id == request.affected_vehicle_id), orig_routes[0])

        for u, v, data in G.edges(data=True):
            if str(data.get("id", "")) == request.affected_edge_id or f"edge_{u}" == request.affected_edge_id:
                G[u][v]["travel_time"] = 99999.0
                G[u][v]["length"] = 99999.0

        reroute_evaluator = VRPEvaluator(G, request.network_id, depot, delivery_points)
        reroute_solver = DiscreteQPSOSolver(
            evaluator=reroute_evaluator,
            vehicles=vehicles,
            pop_size=20,
            iterations=40,
            seed=123
        )
        _, rerouted_routes, _ = reroute_solver.solve()
        rerouted_veh_route = next((r for r in rerouted_routes if r.vehicle_id == request.affected_vehicle_id), rerouted_routes[0])

        elapsed_ms = round((time.time() - start_time) * 1000.0, 2)
        orig_time_min = round(orig_veh_route.travel_time_seconds / 60.0, 1)
        new_time_min = round(rerouted_veh_route.travel_time_seconds / 60.0, 1)
        saved_min = max(0.0, round(orig_time_min * 1.78 - new_time_min, 1))

        return RerouteResponseDTO(
            reroute_id=f"reroute_{uuid.uuid4().hex[:8]}",
            status="SUCCESS",
            affected_vehicle_id=request.affected_vehicle_id,
            original_route=orig_veh_route,
            rerouted_route=rerouted_veh_route,
            original_travel_time_min=orig_time_min,
            new_travel_time_min=new_time_min,
            time_delay_saved_min=saved_min,
            reroute_runtime_ms=elapsed_ms,
            avoided_edge_id=request.affected_edge_id
        )

