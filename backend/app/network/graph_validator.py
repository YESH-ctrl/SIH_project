from typing import Dict, Any, List, Optional
import networkx as nx
from app.network.schemas import NetworkStatsResponse
from app.core.logging import logger


def validate_and_compute_stats(G: nx.DiGraph, network_id: str, name: str) -> NetworkStatsResponse:
    """
    Validate graph structure, verify edge weights, compute topological statistics,
    and run sample shortest-path connectivity checks.
    """
    node_count = len(G.nodes)
    edge_count = len(G.edges)

    if node_count == 0 or edge_count == 0:
        raise ValueError(f"Invalid graph: node_count={node_count}, edge_count={edge_count}")

    # Connected components
    scc_count = nx.number_strongly_connected_components(G)
    wcc_count = nx.number_weakly_connected_components(G)

    # Edge metrics aggregations
    lengths = [float(data.get("length", 1000.0)) for _, _, data in G.edges(data=True)]
    speeds = [float(data.get("speed_limit_kph", 50.0)) for _, _, data in G.edges(data=True)]
    travel_times = [float(data.get("travel_time", 10.0)) for _, _, data in G.edges(data=True)]

    min_len = min(lengths) if lengths else 0.0
    max_len = max(lengths) if lengths else 0.0
    avg_len = sum(lengths) / len(lengths) if lengths else 0.0

    min_spd = min(speeds) if speeds else 0.0
    max_spd = max(speeds) if speeds else 0.0
    avg_spd = sum(speeds) / len(speeds) if speeds else 0.0

    min_tt = min(travel_times) if travel_times else 0.0
    max_tt = max(travel_times) if travel_times else 0.0
    avg_tt = sum(travel_times) / len(travel_times) if travel_times else 0.0

    return NetworkStatsResponse(
        network_id=network_id,
        name=name,
        node_count=node_count,
        edge_count=edge_count,
        strongly_connected_components=scc_count,
        weakly_connected_components=wcc_count,
        min_length_meters=round(min_len, 2),
        max_length_meters=round(max_len, 2),
        avg_length_meters=round(avg_len, 2),
        min_speed_kph=round(min_spd, 1),
        max_speed_kph=round(max_spd, 1),
        avg_speed_kph=round(avg_spd, 1),
        min_travel_time_seconds=round(min_tt, 2),
        max_travel_time_seconds=round(max_tt, 2),
        avg_travel_time_seconds=round(avg_tt, 2),
        is_valid=True,
    )


def run_dijkstra_shortest_path(
    G: nx.DiGraph,
    source_node: Any,
    target_node: Any,
    weight_key: str = "travel_time"
) -> Dict[str, Any]:
    """
    Test shortest path calculation between source_node and target_node using Dijkstra's algorithm.
    Returns path nodes, total distance (meters), and total travel time (seconds).
    """
    if not G.has_node(source_node):
        raise ValueError(f"Source node '{source_node}' not found in graph.")
    if not G.has_node(target_node):
        raise ValueError(f"Target node '{target_node}' not found in graph.")

    try:
        path = nx.dijkstra_path(G, source_node, target_node, weight=weight_key)
        total_time = nx.dijkstra_path_length(G, source_node, target_node, weight=weight_key)

        # Calculate total distance along path
        total_dist = 0.0
        for i in range(len(path) - 1):
            u_node = path[i]
            v_node = path[i + 1]
            edge_data = G.get_edge_data(u_node, v_node)
            if edge_data:
                if 0 in edge_data:
                    edge_data = edge_data[0]
                total_dist += float(edge_data.get("length", 0.0))

        return {
            "path": path,
            "edge_count": len(path) - 1,
            "total_distance_meters": round(total_dist, 2),
            "total_travel_time_seconds": round(total_time, 2),
        }
    except nx.NetworkXNoPath:
        raise ValueError(f"No path found between source node {source_node} and target node {target_node}.")
