import math
import json
from typing import Dict, Any, List, Optional, Tuple
import networkx as nx
from app.core.logging import logger

def haversine_distance_meters(lat1: float, lng1: float, lat2: float, lng2: float) -> float:
    """Calculate great-circle distance between two point pairs in meters."""
    R = 6371000.0  # Earth radius in meters
    phi1 = math.radians(lat1)
    phi2 = math.radians(lat2)
    delta_phi = math.radians(lat2 - lat1)
    delta_lambda = math.radians(lng2 - lng1)

    a = math.sin(delta_phi / 2.0) ** 2 + math.cos(phi1) * math.cos(phi2) * math.sin(delta_lambda / 2.0) ** 2
    c = 2.0 * math.atan2(math.sqrt(a), math.sqrt(1.0 - a))
    return round(R * c, 2)


def find_nearest_node(G: nx.DiGraph, lat: float, lng: float) -> Dict[str, Any]:
    """
    Find the nearest node in graph G to the given latitude and longitude.
    Returns node_id, latitude, longitude, and distance_meters.
    Graph G MUST only contain nodes belonging to the target network.
    """
    if len(G.nodes) == 0:
        raise ValueError("Network graph contains no nodes.")

    best_node_id = None
    best_dist = float("inf")
    best_lat = 0.0
    best_lng = 0.0

    for nid, data in G.nodes(data=True):
        n_lat = float(data.get("y", data.get("lat", 0.0)))
        n_lng = float(data.get("x", data.get("lng", 0.0)))
        
        dist = haversine_distance_meters(lat, lng, n_lat, n_lng)
        if dist < best_dist:
            best_dist = dist
            best_node_id = nid
            best_lat = n_lat
            best_lng = n_lng

    if best_node_id is None:
        raise ValueError("Could not locate a valid nearest node.")

    return {
        "node_id": str(best_node_id),
        "latitude": best_lat,
        "longitude": best_lng,
        "distance_meters": round(best_dist, 2)
    }


def validate_route_geometry(
    coordinates: List[List[float]],
    node_ids: List[str],
    edge_ids: List[str]
) -> None:
    """
    Validate route geometry and structure per Section 16 requirements:
    - geometry exists
    - geometry is valid
    - coordinates are finite
    - coordinate order is longitude/latitude
    - route contains at least 2 coordinates
    """
    if not coordinates or not isinstance(coordinates, list):
        raise ValueError("Route geometry coordinates must be a non-empty list.")
    
    if len(coordinates) < 2:
        raise ValueError(f"Route geometry must contain at least 2 coordinates (got {len(coordinates)}).")

    for idx, coord in enumerate(coordinates):
        if not isinstance(coord, (list, tuple)) or len(coord) < 2:
            raise ValueError(f"Coordinate at index {idx} must be a [longitude, latitude] pair.")
        lng, lat = float(coord[0]), float(coord[1])
        if not (math.isfinite(lng) and math.isfinite(lat)):
            raise ValueError(f"Non-finite coordinate found at index {idx}: [{lng}, {lat}]")
        # Validate coordinate order: longitude [-180, 180], latitude [-90, 90]
        if not (-180.0 <= lng <= 180.0 and -90.0 <= lat <= 90.0):
            raise ValueError(f"Coordinate out of valid WGS84 range at index {idx}: lng={lng}, lat={lat}")


def compute_shortest_path(
    G: nx.DiGraph,
    network_id: str,
    source_node_id: str,
    target_node_id: str,
    weight_key: str = "travel_time"
) -> Dict[str, Any]:
    """
    Compute Dijkstra shortest path between source_node_id and target_node_id on directed graph G.
    The edge cost uses static travel time (length_meters / speed_mps).
    Returns complete route details and GeoJSON LineString geometry with [longitude, latitude] coordinates.
    """
    src_str = str(source_node_id)
    tgt_str = str(target_node_id)

    if not G.has_node(src_str):
        raise ValueError(f"Source node '{src_str}' does not exist in network '{network_id}'.")
    if not G.has_node(tgt_str):
        raise ValueError(f"Target node '{tgt_str}' does not exist in network '{network_id}'.")

    # Handle source == target
    if src_str == tgt_str:
        s_data = G.nodes[src_str]
        s_lat = float(s_data.get("y", s_data.get("lat", 0.0)))
        s_lng = float(s_data.get("x", s_data.get("lng", 0.0)))
        coords = [[s_lng, s_lat], [s_lng, s_lat]]
        validate_route_geometry(coords, [src_str], [])
        return {
            "network_id": network_id,
            "source_node_id": src_str,
            "target_node_id": tgt_str,
            "node_ids": [src_str],
            "edge_ids": [],
            "distance_meters": 0.0,
            "distance_km": 0.0,
            "travel_time_seconds": 0.0,
            "travel_time_min": 0.0,
            "node_count": 1,
            "edge_count": 0,
            "geometry": {
                "type": "LineString",
                "coordinates": coords
            },
            # Backwards compatibility fields for frontend
            "node_path": [src_str],
            "total_distance_meters": 0.0,
            "total_distance_km": 0.0,
            "total_travel_time_seconds": 0.0,
            "total_travel_time_min": 0.0,
            "path_coordinates": [[s_lat, s_lng], [s_lat, s_lng]]
        }

    try:
        path_nodes = nx.dijkstra_path(G, src_str, tgt_str, weight=weight_key)
        total_time_s = nx.dijkstra_path_length(G, src_str, tgt_str, weight=weight_key)
    except nx.NetworkXNoPath:
        raise ValueError(f"No route found between source node '{src_str}' and target node '{tgt_str}' in network '{network_id}'.")

    edge_ids = []
    total_dist_m = 0.0
    line_coords_lng_lat: List[List[float]] = []
    path_coords_lat_lng: List[List[float]] = []

    for i in range(len(path_nodes) - 1):
        u = path_nodes[i]
        v = path_nodes[i + 1]

        u_data = G.nodes[u]
        u_lat = float(u_data.get("y", u_data.get("lat", 0.0)))
        u_lng = float(u_data.get("x", u_data.get("lng", 0.0)))

        v_data = G.nodes[v]
        v_lat = float(v_data.get("y", v_data.get("lat", 0.0)))
        v_lng = float(v_data.get("x", v_data.get("lng", 0.0)))

        edge_data = G.get_edge_data(u, v)
        if edge_data:
            if 0 in edge_data:
                edge_data = edge_data[0]

            edge_id = edge_data.get("id")
            if not edge_id:
                edge_id = f"edge_{u}_{v}"
            edge_ids.append(str(edge_id))

            length_m = float(edge_data.get("length", 0.0))
            if length_m <= 0.0:
                length_m = haversine_distance_meters(u_lat, u_lng, v_lat, v_lng)
            total_dist_m += length_m

            # Process geometry with string parsing, Shapely support, orientation verification, and continuity
            geom = edge_data.get("geometry")
            raw_e_coords = []

            if geom is not None:
                if hasattr(geom, "coords"):
                    try:
                        raw_e_coords = list(geom.coords)
                    except Exception:
                        raw_e_coords = []
                elif hasattr(geom, "__geo_interface__"):
                    try:
                        g_dict = geom.__geo_interface__
                        if isinstance(g_dict, dict) and "coordinates" in g_dict:
                            raw_e_coords = g_dict["coordinates"]
                    except Exception:
                        raw_e_coords = []
                elif isinstance(geom, str):
                    try:
                        import json
                        parsed_g = json.loads(geom)
                        if isinstance(parsed_g, dict) and "coordinates" in parsed_g:
                            raw_e_coords = parsed_g["coordinates"]
                    except Exception:
                        raw_e_coords = []
                elif isinstance(geom, dict) and "coordinates" in geom:
                    raw_e_coords = geom.get("coordinates", [])

            parsed_pts: List[Tuple[float, float]] = []
            if raw_e_coords and isinstance(raw_e_coords, (list, tuple)):
                for pt in raw_e_coords:
                    if isinstance(pt, (list, tuple)) and len(pt) >= 2:
                        c1, c2 = float(pt[0]), float(pt[1])
                        if c1 < c2 and c1 > 5.0 and c1 < 40.0 and c2 > 60.0 and c2 < 100.0:
                            lng_val, lat_val = c2, c1
                        else:
                            lng_val, lat_val = c1, c2
                        parsed_pts.append((lng_val, lat_val))

            if parsed_pts:
                # Check orientation: compare distance from node u to first point vs last point
                first_pt = parsed_pts[0]
                last_pt = parsed_pts[-1]
                dist_to_first = haversine_distance_meters(u_lat, u_lng, first_pt[1], first_pt[0])
                dist_to_last = haversine_distance_meters(u_lat, u_lng, last_pt[1], last_pt[0])

                if dist_to_last < dist_to_first:
                    parsed_pts.reverse()

                for lng_val, lat_val in parsed_pts:
                    if not line_coords_lng_lat or line_coords_lng_lat[-1] != [lng_val, lat_val]:
                        line_coords_lng_lat.append([lng_val, lat_val])
                        path_coords_lat_lng.append([lat_val, lng_val])
            else:
                # Fallback to straight segment between node u and node v
                if not line_coords_lng_lat or line_coords_lng_lat[-1] != [u_lng, u_lat]:
                    line_coords_lng_lat.append([u_lng, u_lat])
                    path_coords_lat_lng.append([u_lat, u_lng])
                line_coords_lng_lat.append([v_lng, v_lat])
                path_coords_lat_lng.append([v_lat, v_lng])
        else:
            if not line_coords_lng_lat or line_coords_lng_lat[-1] != [u_lng, u_lat]:
                line_coords_lng_lat.append([u_lng, u_lat])
                path_coords_lat_lng.append([u_lat, u_lng])
            line_coords_lng_lat.append([v_lng, v_lat])
            path_coords_lat_lng.append([v_lat, v_lng])

    # Final sanity check: ensure at least 2 points in LineString
    if len(line_coords_lng_lat) < 2:
        s_data = G.nodes[src_str]
        s_lat = float(s_data.get("y", s_data.get("lat", 0.0)))
        s_lng = float(s_data.get("x", s_data.get("lng", 0.0)))
        t_data = G.nodes[tgt_str]
        t_lat = float(t_data.get("y", t_data.get("lat", 0.0)))
        t_lng = float(t_data.get("x", t_data.get("lng", 0.0)))
        line_coords_lng_lat = [[s_lng, s_lat], [t_lng, t_lat]]
        path_coords_lat_lng = [[s_lat, s_lng], [t_lat, t_lng]]

    # Validate route geometry against all strict Section 16 requirements
    validate_route_geometry(line_coords_lng_lat, path_nodes, edge_ids)

    dist_m_rounded = round(total_dist_m, 2)
    dist_km_rounded = round(total_dist_m / 1000.0, 2)
    time_s_rounded = round(total_time_s, 2)
    time_min_rounded = round(total_time_s / 60.0, 2)

    logger.info(
        f"[routing] Route computed: network={network_id} src={src_str} tgt={tgt_str} "
        f"nodes={len(path_nodes)} edges={len(edge_ids)} dist={dist_m_rounded}m "
        f"geom_coords={len(line_coords_lng_lat)} "
        f"first={line_coords_lng_lat[0] if line_coords_lng_lat else 'N/A'} "
        f"last={line_coords_lng_lat[-1] if line_coords_lng_lat else 'N/A'}"
    )

    return {
        "network_id": network_id,
        "source_node_id": src_str,
        "target_node_id": tgt_str,
        "node_ids": path_nodes,
        "edge_ids": edge_ids,
        "distance_meters": dist_m_rounded,
        "distance_km": dist_km_rounded,
        "travel_time_seconds": time_s_rounded,
        "travel_time_min": time_min_rounded,
        "node_count": len(path_nodes),
        "edge_count": len(path_nodes) - 1,
        "algorithm": "Dijkstra (Static Weight)",
        "geometry": {
            "type": "LineString",
            "coordinates": line_coords_lng_lat
        },
        # Backwards compatibility fields for frontend
        "node_path": path_nodes,
        "total_distance_meters": dist_m_rounded,
        "total_distance_km": dist_km_rounded,
        "total_travel_time_seconds": time_s_rounded,
        "total_travel_time_min": time_min_rounded,
        "path_coordinates": path_coords_lat_lng
    }
