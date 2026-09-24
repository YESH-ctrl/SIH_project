import os
import json
import math
from pathlib import Path
from typing import Dict, Any, Optional
import networkx as nx
from app.core.logging import logger

try:
    import osmnx as ox
except ImportError:
    ox = None


def haversine_distance(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Calculate the great-circle distance between two points on the Earth in meters."""
    R = 6371000.0  # Earth radius in meters
    phi1 = math.radians(lat1)
    phi2 = math.radians(lat2)
    delta_phi = math.radians(lat2 - lat1)
    delta_lambda = math.radians(lon2 - lon1)

    a = math.sin(delta_phi / 2.0) ** 2 + math.cos(phi1) * math.cos(phi2) * math.sin(delta_lambda / 2.0) ** 2
    c = 2.0 * math.atan2(math.sqrt(a), math.sqrt(1.0 - a))
    return R * c


def load_raipur_from_json() -> Optional[nx.DiGraph]:
    """Load Raipur authentic OSM road network from raipur-osm.json."""
    candidates = [
        Path(__file__).resolve().parent.parent.parent.parent / "frontend" / "raipur-osm.json",
        Path(__file__).resolve().parent.parent.parent / "frontend" / "raipur-osm.json",
        Path("frontend/raipur-osm.json"),
        Path("../frontend/raipur-osm.json"),
    ]

    json_path = None
    for p in candidates:
        if p.exists():
            json_path = p
            break

    if not json_path:
        return None

    try:
        logger.info(f"Loading authentic Raipur OSM road network from '{json_path}'...")
        with open(json_path, "r", encoding="utf-8") as f:
            data = json.load(f)

        elements = data.get("elements", [])
        G = nx.DiGraph()

        # Speed limit defaults by highway type
        default_speeds = {
            "motorway": 80,
            "trunk": 70,
            "primary": 60,
            "secondary": 50,
            "tertiary": 40,
            "residential": 30,
            "living_street": 20,
            "unclassified": 30,
            "service": 20,
        }

        edge_counter = 50000001
        for el in elements:
            if el.get("type") != "way":
                continue

            way_id = el.get("id")
            nodes = el.get("nodes", [])
            geom = el.get("geometry", [])
            tags = el.get("tags", {})

            highway = tags.get("highway", "residential").lower()
            road_name = tags.get("name") or tags.get("ref") or "Urban Corridor"
            oneway = tags.get("oneway", "no").lower() in ("yes", "1", "true")

            # Parse speed
            maxspeed_raw = tags.get("maxspeed", "")
            maxspeed = default_speeds.get(highway, 40)
            if maxspeed_raw and maxspeed_raw.isdigit():
                maxspeed = int(maxspeed_raw)

            # Store nodes in graph
            if len(nodes) == len(geom):
                for nid, pt in zip(nodes, geom):
                    if nid not in G:
                        G.add_node(nid, x=float(pt["lon"]), y=float(pt["lat"]), osm_id=nid)

                for i in range(len(nodes) - 1):
                    u = nodes[i]
                    v = nodes[i + 1]
                    dist = haversine_distance(geom[i]["lat"], geom[i]["lon"], geom[i + 1]["lat"], geom[i + 1]["lon"])
                    dist = max(1.0, round(dist, 1))

                    u_lon, u_lat = float(geom[i]["lon"]), float(geom[i]["lat"])
                    v_lon, v_lat = float(geom[i + 1]["lon"]), float(geom[i + 1]["lat"])
                    edge_id = str(way_id) if way_id else f"edge_{u}_{v}"

                    edge_data = {
                        "key": 0,
                        "id": edge_id,
                        "osmid": way_id or edge_counter,
                        "name": road_name,
                        "highway": highway.upper(),
                        "length": dist,
                        "maxspeed": maxspeed,
                        "oneway": oneway,
                        "geometry": {
                            "type": "LineString",
                            "coordinates": [[u_lon, u_lat], [v_lon, v_lat]],
                        },
                    }
                    G.add_edge(u, v, **edge_data)
                    if not oneway:
                        rev_edge_data = dict(edge_data)
                        rev_edge_data["id"] = f"edge_{v}_{u}"
                        rev_edge_data["geometry"] = {
                            "type": "LineString",
                            "coordinates": [[v_lon, v_lat], [u_lon, u_lat]],
                        }
                        G.add_edge(v, u, **rev_edge_data)
                    edge_counter += 1

        logger.info(f"Loaded {len(G.nodes)} nodes and {len(G.edges)} edges from '{json_path}'.")
        return G
    except Exception as e:
        logger.error(f"Failed to load Raipur OSM JSON: {e}")
        return None


def load_osm_graph_from_place(city: str, network_type: str = "drive") -> nx.DiGraph:
    """
    Download driving road network from OpenStreetMap using OSMnx or local OSM JSON.
    Returns a directed DiGraph.
    Falls back to synthetic graph if live OSM endpoint is unreachable.
    """
    city_key = city.strip().lower()

    # If Raipur, check for high-fidelity raipur-osm.json first
    if "raipur" in city_key:
        local_g = load_raipur_from_json()
        if local_g and len(local_g.nodes) > 0:
            return local_g

    # If OSMnx is available, try live download
    if ox is not None:
        try:
            logger.info(f"Downloading OSM road network for '{city}' (network_type={network_type})...")
            ox.settings.use_cache = True
            ox.settings.log_console = False
            ox.settings.timeout = 20

            city_coords = {
                "raipur, india": (21.2514, 81.6296),
                "hyderabad, india": (17.3850, 78.4867),
                "bengaluru, india": (12.9716, 77.5946),
                "panaji, india": (15.4909, 73.8278),
                "chandigarh, india": (30.7333, 76.7794),
                "mumbai, india": (19.0760, 72.8777),
                "delhi, india": (28.6139, 77.2090),
            }

            if city_key in city_coords:
                coords = city_coords[city_key]
                logger.info(f"Extracting live OSM road network around center {coords} for '{city}'...")
                G = ox.graph_from_point(coords, dist=2000, network_type=network_type, simplify=True)
                if G and len(G.nodes) > 0:
                    logger.info(f"Successfully downloaded live OSM graph for '{city}' ({len(G.nodes)} nodes, {len(G.edges)} edges).")
                    return nx.DiGraph(G)

            G = ox.graph_from_place(city, network_type=network_type, simplify=True)
            if G and len(G.nodes) > 0:
                logger.info(f"Successfully downloaded live OSM place graph for '{city}' ({len(G.nodes)} nodes, {len(G.edges)} edges).")
                return nx.DiGraph(G)
        except Exception as e:
            logger.warning(f"Unable to download live OSM graph for '{city}' via OSMnx: {e}.")
    else:
        logger.warning(f"OSMnx library not installed. Using local or synthetic fallback for '{city}'.")

    # Final fallback: synthetic city graph
    return create_synthetic_city_graph(city)


def create_synthetic_city_graph(city_name: str) -> nx.DiGraph:
    """Create a clean, deterministic synthetic directed city road network graph for offline dev & testing."""
    G = nx.DiGraph()
    base_lat = 21.2514
    base_lng = 81.6296

    node_mapping = {}
    node_id_counter = 10000001

    for row in range(5):
        for col in range(5):
            osm_id = node_id_counter
            node_id_counter += 1
            lat = round(base_lat + (row * 0.005), 6)
            lng = round(base_lng + (col * 0.005), 6)
            G.add_node(osm_id, x=lng, y=lat, osm_id=osm_id)
            node_mapping[(row, col)] = osm_id

    road_types = ["PRIMARY", "SECONDARY", "TERTIARY", "RESIDENTIAL"]
    road_names = ["Central Expressway", "Station Road", "Ring Road", "Civil Lines Road", "Market Street"]

    edge_counter = 50000001
    for row in range(5):
        for col in range(5):
            curr_node = node_mapping[(row, col)]
            if col < 4:
                right_node = node_mapping[(row, col + 1)]
                r_type = road_types[(row + col) % len(road_types)]
                r_name = road_names[row % len(road_names)]
                c_lng, c_lat = G.nodes[curr_node]["x"], G.nodes[curr_node]["y"]
                r_lng, r_lat = G.nodes[right_node]["x"], G.nodes[right_node]["y"]
                G.add_edge(curr_node, right_node, key=0, id=f"edge_{curr_node}_{right_node}", osmid=edge_counter, name=r_name, highway=r_type, length=550.0, maxspeed=50, geometry={"type": "LineString", "coordinates": [[c_lng, c_lat], [r_lng, r_lat]]})
                G.add_edge(right_node, curr_node, key=0, id=f"edge_{right_node}_{curr_node}", osmid=edge_counter + 1, name=r_name, highway=r_type, length=550.0, maxspeed=50, geometry={"type": "LineString", "coordinates": [[r_lng, r_lat], [c_lng, c_lat]]})
                edge_counter += 2
            if row < 4:
                down_node = node_mapping[(row + 1, col)]
                r_type = road_types[(row + col + 1) % len(road_types)]
                r_name = road_names[col % len(road_names)]
                c_lng, c_lat = G.nodes[curr_node]["x"], G.nodes[curr_node]["y"]
                d_lng, d_lat = G.nodes[down_node]["x"], G.nodes[down_node]["y"]
                G.add_edge(curr_node, down_node, key=0, id=f"edge_{curr_node}_{down_node}", osmid=edge_counter, name=r_name, highway=r_type, length=600.0, maxspeed=40, geometry={"type": "LineString", "coordinates": [[c_lng, c_lat], [d_lng, d_lat]]})
                G.add_edge(down_node, curr_node, key=0, id=f"edge_{down_node}_{curr_node}", osmid=edge_counter + 1, name=r_name, highway=r_type, length=600.0, maxspeed=40, geometry={"type": "LineString", "coordinates": [[d_lng, d_lat], [c_lng, c_lat]]})
                edge_counter += 2

    return G
