import pytest
import networkx as nx
from app.network.routing import (
    compute_shortest_path,
    validate_route_geometry,
    validate_route_feasibility,
)
from app.network.osm_loader import create_synthetic_city_graph
from app.optimization.demo_data import get_raipur_demo_dataset
from app.optimization.discrete_qpso import VRPEvaluator, BaselineVRPSolver, DiscreteQPSOSolver
from app.optimization.service import OptimizationService


def test_no_straight_line_fallback_on_unreachable_target():
    """
    REGRESSION TEST:
    When a target node is disconnected or unreachable in the directed graph,
    the system must RAISE an exception / reject the route, and NEVER return
    a direct straight-line LineString geometry.
    """
    G = nx.DiGraph()
    # Add two isolated nodes with no edge
    G.add_node("node_A", x=81.6294, y=21.2517)
    G.add_node("node_B", x=81.6450, y=21.2575)

    with pytest.raises((ValueError, nx.NetworkXNoPath)):
        compute_shortest_path(G, "test_net", "node_A", "node_B")


def test_oneway_directionality_enforcement():
    """
    REGRESSION TEST:
    When road A->B is one-way, routing B->A must fail or find an alternative legal route,
    never reversing illegally against one-way direction.
    """
    G = nx.DiGraph()
    G.add_node("node_A", x=81.6290, y=21.2510)
    G.add_node("node_B", x=81.6300, y=21.2520)
    # Directed edge only from A to B
    G.add_edge("node_A", "node_B", id="edge_AB", length=150.0, travel_time=12.0,
               geometry={"type": "LineString", "coordinates": [[81.6290, 21.2510], [81.6300, 21.2520]]})

    # Forward should succeed
    res_fwd = compute_shortest_path(G, "test_net", "node_A", "node_B")
    assert res_fwd["geometry"]["type"] == "LineString"
    assert len(res_fwd["geometry"]["coordinates"]) >= 2
    assert res_fwd["validation"]["valid"] is True
    assert res_fwd["validation"]["used_fallback_geometry"] is False

    # Reverse must fail (no legal road against one-way)
    with pytest.raises((ValueError, nx.NetworkXNoPath)):
        compute_shortest_path(G, "test_net", "node_B", "node_A")


def test_incident_edge_blocking_avoidance():
    """
    REGRESSION TEST:
    When an edge is blocked by an incident, compute_shortest_path and QPSO
    must avoid the blocked edge and use a valid detour along real graph edges.
    """
    G = nx.DiGraph()
    G.add_node("1", x=81.620, y=21.250)
    G.add_node("2", x=81.625, y=21.250)
    G.add_node("3", x=81.630, y=21.250)
    G.add_node("detour", x=81.625, y=21.255)

    # Primary path: 1 -> 2 -> 3
    G.add_edge("1", "2", id="edge_1_2", length=500.0, travel_time=30.0,
               geometry={"type": "LineString", "coordinates": [[81.620, 21.250], [81.625, 21.250]]})
    G.add_edge("2", "3", id="edge_2_3", length=500.0, travel_time=30.0,
               geometry={"type": "LineString", "coordinates": [[81.625, 21.250], [81.630, 21.250]]})

    # Detour path: 1 -> detour -> 3
    G.add_edge("1", "detour", id="edge_1_detour", length=600.0, travel_time=40.0,
               geometry={"type": "LineString", "coordinates": [[81.620, 21.250], [81.625, 21.255]]})
    G.add_edge("detour", "3", id="edge_detour_3", length=600.0, travel_time=40.0,
               geometry={"type": "LineString", "coordinates": [[81.625, 21.255], [81.630, 21.250]]})

    # Without blockage: primary path used
    res_normal = compute_shortest_path(G, "test_net", "1", "3")
    assert res_normal["node_ids"] == ["1", "2", "3"]
    assert "edge_2_3" in res_normal["edge_ids"]

    # Block edge_2_3: detour must be used
    res_blocked = compute_shortest_path(G, "test_net", "1", "3", blocked_edge_ids=["edge_2_3"])
    assert res_blocked["node_ids"] == ["1", "detour", "3"]
    assert "edge_2_3" not in res_blocked["edge_ids"]
    assert "edge_1_detour" in res_blocked["edge_ids"]
    assert res_blocked["validation"]["blocked_edges_avoided"] is True
    assert res_blocked["validation"]["used_fallback_geometry"] is False


def test_qpso_infeasible_route_rejection():
    """
    REGRESSION TEST:
    QPSO must reject candidate permutations that require traversing impossible or
    disconnected legs, guaranteeing no straight lines are returned.
    """
    G = create_synthetic_city_graph("Raipur, India")
    depot, delivery_points, vehicles = get_raipur_demo_dataset()

    evaluator = VRPEvaluator(G, "test_net", depot, delivery_points[:4])
    solver = DiscreteQPSOSolver(evaluator, vehicles, pop_size=10, iterations=15, seed=42)
    metrics, routes, _ = solver.solve()

    assert metrics.total_distance_km > 0
    assert len(routes) > 0
    for r in routes:
        if r.stops:
            assert r.feasible is True
            assert r.validation is not None
            assert r.validation.valid is True
            assert r.validation.used_fallback_geometry is False
            assert r.validation.geometry_source == "OSM_EDGE_GEOMETRY"
            # Ensure coordinates are continuous and not a 2-point straight line across city
            assert len(r.geometry.get("coordinates", [])) >= len(r.stops) + 1


def test_optimization_run_response_validation_metadata():
    """
    Verify that OptimizationService demo run includes complete validation metadata.
    """
    service = OptimizationService()
    res = service.run_qpso_demo()

    for r in res.qpso_routes:
        assert r.geometry_source == "OSM_EDGE_GEOMETRY"
        if r.stops:
            assert r.validation is not None
            assert r.validation.valid is True
            assert r.validation.used_fallback_geometry is False
            assert r.validation.blocked_edges_avoided is True
            assert len(r.geometry["coordinates"]) >= 2
