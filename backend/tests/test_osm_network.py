import pytest
import uuid
import networkx as nx

from app.network.speed_parser import (
    normalize_road_type,
    parse_speed_limit,
    get_road_capacity,
    calculate_static_travel_time,
)
from app.network.weight_calculator import apply_static_weights
from app.network.osm_loader import create_synthetic_city_graph
from app.network.node_mapper import map_graph_nodes
from app.network.edge_mapper import map_graph_edges
from app.network.graph_validator import validate_and_compute_stats, run_dijkstra_shortest_path
from app.network.service import NetworkService


def test_speed_parser():
    # Test normalization
    assert normalize_road_type("primary") == "PRIMARY"
    assert normalize_road_type(["secondary", "primary"]) == "SECONDARY"

    # Test numeric maxspeed
    sp, prov = parse_speed_limit(60, "PRIMARY")
    assert sp == 60.0
    assert prov == "OSM"

    # Test string maxspeed with units
    sp, prov = parse_speed_limit("50 km/h", "PRIMARY")
    assert sp == 50.0
    assert prov == "OSM"

    # Test mph string
    sp, prov = parse_speed_limit("30 mph", "RESIDENTIAL")
    assert round(sp, 1) == 48.3
    assert prov == "OSM"

    # Test fallback
    sp, prov = parse_speed_limit("signals", "PRIMARY")
    assert sp == 60.0
    assert prov == "FALLBACK"


def test_static_travel_time_calculation():
    # 1000m at 36 km/h (10 m/s) -> 100s
    tt = calculate_static_travel_time(1000.0, 36.0)
    assert tt == 100.0

    # 500m at 50 km/h -> 36s
    tt2 = calculate_static_travel_time(500.0, 50.0)
    assert tt2 == 36.0


def test_node_and_edge_mapping():
    G = create_synthetic_city_graph("TestCity")
    G = apply_static_weights(G)

    net_id = str(uuid.uuid4())
    node_models, osm_to_uuid = map_graph_nodes(G, net_id)
    edge_models = map_graph_edges(G, net_id, osm_to_uuid)

    assert len(node_models) == len(G.nodes)
    assert len(edge_models) == len(G.edges)
    assert len(osm_to_uuid) == len(G.nodes)

    # Verify attributes
    assert edge_models[0].road_name is not None
    assert edge_models[0].length_meters > 0
    assert edge_models[0].speed_limit_kph > 0
    assert edge_models[0].capacity_vehicles > 0


def test_graph_validator_and_dijkstra():
    G = create_synthetic_city_graph("TestCity")
    G = apply_static_weights(G)

    net_id = str(uuid.uuid4())
    stats = validate_and_compute_stats(G, net_id, "TestCity Road Network")

    assert stats.node_count == 25
    assert stats.edge_count > 0
    assert stats.avg_length_meters > 0
    assert stats.avg_speed_kph > 0
    assert stats.avg_travel_time_seconds > 0

    # Test shortest path Dijkstra
    nodes = list(G.nodes)
    result = run_dijkstra_shortest_path(G, nodes[0], nodes[-1], weight_key="travel_time")
    assert len(result["path"]) > 1
    assert result["total_distance_meters"] > 0
    assert result["total_travel_time_seconds"] > 0


@pytest.mark.asyncio
async def test_network_service_import_and_routing():
    org_id = "00000000-0000-0000-0000-000000000001"
    service = NetworkService(db=None)

    # Test importing synthetic city
    stats = await service.import_osm_network(
        organization_id=org_id,
        city="Synthetic Test City",
        network_type="drive",
        version="v1.0"
    )

    assert stats.network_id is not None
    assert stats.node_count == 25
    assert stats.edge_count > 0
    assert stats.is_valid is True

    # Test shortest path calculation
    from app.network.schemas import ShortestPathRouteRequest
    req = ShortestPathRouteRequest(
        source_lat=21.2514,
        source_lng=81.6296,
        target_lat=21.2714,
        target_lng=81.6496
    )
    route_res = await service.calculate_shortest_path(stats.network_id, org_id, req)
    assert route_res.network_id == stats.network_id
    assert route_res.edge_count > 0
    assert route_res.total_distance_km > 0
    assert route_res.total_travel_time_min > 0
    assert len(route_res.path_coordinates) > 1
