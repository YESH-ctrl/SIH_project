import networkx as nx
from app.network.speed_parser import (
    normalize_road_type,
    parse_speed_limit,
    get_road_capacity,
    calculate_static_travel_time,
)


def apply_static_weights(G: nx.DiGraph) -> nx.DiGraph:
    """
    Annotate all directed edges in NetworkX graph G with static travel-time weights:
    - road_type (normalized)
    - speed_limit_kph
    - capacity_vehicles
    - travel_time (seconds)
    - free_flow_time (seconds)
    """
    is_multi = G.is_multigraph()

    if is_multi:
        edge_iter = [(u, v, data) for u, v, k, data in G.edges(keys=True, data=True)]
    else:
        edge_iter = [(u, v, data) for u, v, data in G.edges(data=True)]

    for u, v, data in edge_iter:
        road_type = normalize_road_type(data.get("highway"))
        raw_maxspeed = data.get("maxspeed")
        speed_kph, provenance = parse_speed_limit(raw_maxspeed, road_type)
        length_m = float(data.get("length", 1000.0))
        travel_time_sec = calculate_static_travel_time(length_m, speed_kph)
        capacity = get_road_capacity(road_type)

        data["road_type"] = road_type
        data["speed_limit_kph"] = speed_kph
        data["speed_provenance"] = provenance
        data["capacity_vehicles"] = capacity
        data["travel_time"] = travel_time_sec
        data["free_flow_time"] = travel_time_sec

    return G
