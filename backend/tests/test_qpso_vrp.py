import pytest
from app.network.osm_loader import create_synthetic_city_graph
from app.optimization.demo_data import get_raipur_demo_dataset
from app.optimization.discrete_qpso import VRPEvaluator, BaselineVRPSolver, DiscreteQPSOSolver
from app.optimization.service import OptimizationService

def test_qpso_vrp_evaluator_and_solvers():
    G = create_synthetic_city_graph("Raipur, India")
    depot, delivery_points, vehicles = get_raipur_demo_dataset()

    # Filter to first 5 delivery points for fast test
    deliv_sample = delivery_points[:5]

    evaluator = VRPEvaluator(G, "test_net_01", depot, deliv_sample)
    assert evaluator.num_locs == 6  # 1 depot + 5 delivery points

    # Baseline Greedy VRP test
    baseline = BaselineVRPSolver(evaluator, vehicles)
    base_metrics, base_routes = baseline.solve()
    assert base_metrics.total_distance_km > 0
    assert len(base_routes) > 0

    # QPSO test
    qpso = DiscreteQPSOSolver(evaluator, vehicles, pop_size=15, iterations=20, seed=42)
    qpso_metrics, qpso_routes, convergence = qpso.solve()

    assert qpso_metrics.total_distance_km > 0
    assert len(qpso_routes) > 0
    assert len(convergence) > 0
    assert qpso_metrics.fitness_score <= base_metrics.fitness_score * 1.2  # Reasonable bounds

def test_optimization_service():
    service = OptimizationService()
    res = service.run_qpso_demo()

    assert res.status == "COMPLETED"
    assert res.run_id.startswith("opt_")
    assert len(res.qpso_routes) > 0
    assert res.baseline_metrics.total_distance_km > 0
    assert res.qpso_metrics.total_distance_km > 0
    assert isinstance(res.distance_improvement_pct, float)
    assert isinstance(res.time_improvement_pct, float)
    assert isinstance(res.fitness_improvement_pct, float)

def test_incident_simulation_and_reroute():
    from app.optimization.models import IncidentSimulationRequestDTO, RerouteRequestDTO
    service = OptimizationService()

    # Test incident simulation
    inc_res = service.simulate_incident(IncidentSimulationRequestDTO())
    assert inc_res.status == "ACTIVE"
    assert inc_res.affected_vehicle_id == "veh_01"
    assert inc_res.edge_id != ""

    # Test reroute execution
    reroute_req = RerouteRequestDTO(
        network_id="9cb256c8-6c5a-4f05-8259-e8b887334fa2",
        incident_id=inc_res.incident_id,
        affected_edge_id=inc_res.edge_id,
        affected_vehicle_id=inc_res.affected_vehicle_id
    )
    reroute_res = service.reroute_vehicle(reroute_req)
    assert reroute_res.status == "SUCCESS"
    assert reroute_res.affected_vehicle_id == "veh_01"
    assert reroute_res.rerouted_route.distance_meters > 0


