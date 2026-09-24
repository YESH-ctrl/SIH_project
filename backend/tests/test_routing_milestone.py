import pytest
import uuid
import networkx as nx
from app.network.osm_loader import create_synthetic_city_graph
from app.network.weight_calculator import apply_static_weights
from app.network.routing import compute_shortest_path, find_nearest_node, validate_route_geometry
from app.network.service import NetworkService
from app.network.schemas import ShortestPathRouteRequest, NearestNodeRequest

@pytest.fixture
def sample_graph():
    G_raw = create_synthetic_city_graph("TestCity")
    G_weighted = apply_static_weights(G_raw)
    # Convert node keys to string IDs
    return nx.relabel_nodes(G_weighted, {n: str(n) for n in G_weighted.nodes})

def test_1_known_source_to_target_returns_path(sample_graph):
    net_id = str(uuid.uuid4())
    nodes = list(sample_graph.nodes)
    res = compute_shortest_path(sample_graph, net_id, nodes[0], nodes[-1], weight_key="travel_time")
    
    assert res["network_id"] == net_id
    assert res["source_node_id"] == nodes[0]
    assert res["target_node_id"] == nodes[-1]
    assert len(res["node_ids"]) > 1
    assert len(res["edge_ids"]) == len(res["node_ids"]) - 1
    assert res["node_count"] == len(res["node_ids"])
    assert res["edge_count"] == len(res["edge_ids"])

def test_2_source_equals_target_handled(sample_graph):
    net_id = str(uuid.uuid4())
    nodes = list(sample_graph.nodes)
    res = compute_shortest_path(sample_graph, net_id, nodes[0], nodes[0], weight_key="travel_time")
    
    assert res["source_node_id"] == nodes[0]
    assert res["target_node_id"] == nodes[0]
    assert res["node_ids"] == [nodes[0]]
    assert res["edge_ids"] == []
    assert res["distance_meters"] == 0.0
    assert res["travel_time_seconds"] == 0.0
    assert res["node_count"] == 1
    assert res["edge_count"] == 0
    assert res["geometry"]["type"] == "LineString"
    assert len(res["geometry"]["coordinates"]) == 2

def test_3_invalid_source_rejected(sample_graph):
    net_id = str(uuid.uuid4())
    nodes = list(sample_graph.nodes)
    invalid_src = "non_existent_source_node_9999"
    with pytest.raises(ValueError, match="Source node .* does not exist"):
        compute_shortest_path(sample_graph, net_id, invalid_src, nodes[-1])

def test_4_invalid_target_rejected(sample_graph):
    net_id = str(uuid.uuid4())
    nodes = list(sample_graph.nodes)
    invalid_tgt = "non_existent_target_node_9999"
    with pytest.raises(ValueError, match="Target node .* does not exist"):
        compute_shortest_path(sample_graph, net_id, nodes[0], invalid_tgt)

def test_5_source_from_another_network_rejected(sample_graph):
    net_id = str(uuid.uuid4())
    other_net_node_id = str(uuid.uuid4())
    nodes = list(sample_graph.nodes)
    with pytest.raises(ValueError, match="Source node .* does not exist in network"):
        compute_shortest_path(sample_graph, net_id, other_net_node_id, nodes[0])

def test_6_disconnected_nodes_return_no_route():
    net_id = str(uuid.uuid4())
    G = nx.DiGraph()
    G.add_node("node_a", y=21.25, x=81.63)
    G.add_node("node_b", y=21.26, x=81.64)
    # No edge between node_a and node_b
    with pytest.raises(ValueError, match="No route found"):
        compute_shortest_path(G, net_id, "node_a", "node_b")

def test_7_route_distance_greater_than_zero(sample_graph):
    net_id = str(uuid.uuid4())
    nodes = list(sample_graph.nodes)
    res = compute_shortest_path(sample_graph, net_id, nodes[0], nodes[1])
    assert res["distance_meters"] > 0.0

def test_8_route_travel_time_greater_than_zero(sample_graph):
    net_id = str(uuid.uuid4())
    nodes = list(sample_graph.nodes)
    res = compute_shortest_path(sample_graph, net_id, nodes[0], nodes[1])
    assert res["travel_time_seconds"] > 0.0

def test_9_geometry_is_valid_linestring(sample_graph):
    net_id = str(uuid.uuid4())
    nodes = list(sample_graph.nodes)
    res = compute_shortest_path(sample_graph, net_id, nodes[0], nodes[-1])
    
    geom = res["geometry"]
    assert geom is not None
    assert geom["type"] == "LineString"
    assert isinstance(geom["coordinates"], list)
    assert len(geom["coordinates"]) >= 2

def test_10_coordinate_order_is_longitude_latitude(sample_graph):
    net_id = str(uuid.uuid4())
    nodes = list(sample_graph.nodes)
    res = compute_shortest_path(sample_graph, net_id, nodes[0], nodes[-1])
    
    coords = res["geometry"]["coordinates"]
    for lng, lat in coords:
        # In Raipur / Test graph: longitude ~ 81.6, latitude ~ 21.25
        assert 60.0 <= lng <= 100.0, f"Expected longitude in [60, 100], got {lng}"
        assert 5.0 <= lat <= 40.0, f"Expected latitude in [5, 40], got {lat}"

@pytest.mark.asyncio
async def test_nearest_node_endpoint_logic(sample_graph):
    net_id = str(uuid.uuid4())
    org_id = str(uuid.uuid4())
    service = NetworkService(db=None)
    
    # Mock repo network lookup and graph reconstruction
    from app.infrastructure.database.models.network import RoadNetwork
    async def mock_get_net(nid, oid):
        return RoadNetwork(id=uuid.UUID(nid), organization_id=uuid.UUID(oid), name="Mock Net", source="OSM", version="v1.0")
    async def mock_get_graph(nid):
        return sample_graph
        
    service.repo.get_network_by_id = mock_get_net
    service._get_or_reconstruct_graph = mock_get_graph
    
    # Nearest node lookup
    res = await service.get_nearest_node(net_id, org_id, 21.25, 81.63)
    assert res.node_id in sample_graph.nodes
    assert res.distance_meters >= 0.0
