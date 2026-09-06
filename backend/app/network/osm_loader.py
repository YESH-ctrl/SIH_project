import osmnx as ox
import networkx as nx
import shapely.geometry
from app.core.logging import logger


def load_osm_graph_from_place(city: str, network_type: str = "drive") -> nx.DiGraph:
    """
    Download driving road network from OpenStreetMap using OSMnx.
    Returns a directed MultiDiGraph / DiGraph.
    Extracts live OpenStreetMap road network via point radius or place polygon,
    falling back to synthetic graph if live OSM endpoint is unreachable.
    """
    try:
        logger.info(f"Downloading OSM road network for '{city}' (network_type={network_type})...")
        ox.settings.use_cache = True
        ox.settings.log_console = False
        ox.settings.timeout = 20

        # City coordinates lookup for fast point-radius extraction
        city_coords = {
            "raipur, india": (21.2514, 81.6296),
            "hyderabad, india": (17.3850, 78.4867),
            "bengaluru, india": (12.9716, 77.5946),
            "panaji, india": (15.4909, 73.8278),
            "chandigarh, india": (30.7333, 76.7794),
            "mumbai, india": (19.0760, 72.8777),
            "delhi, india": (28.6139, 77.2090),
        }
        city_key = city.strip().lower()
        if city_key in city_coords:
            coords = city_coords[city_key]
            logger.info(f"Extracting live OSM road network around center {coords} for '{city}'...")
            G = ox.graph_from_point(coords, dist=2000, network_type=network_type, simplify=True)
            if G and len(G.nodes) > 0:
                logger.info(f"Successfully downloaded live OSM graph for '{city}' ({len(G.nodes)} nodes, {len(G.edges)} edges).")
                return nx.DiGraph(G)

        # Fallback to ox.graph_from_place
        G = ox.graph_from_place(city, network_type=network_type, simplify=True)
        if G and len(G.nodes) > 0:
            logger.info(f"Successfully downloaded live OSM place graph for '{city}' ({len(G.nodes)} nodes, {len(G.edges)} edges).")
            return nx.DiGraph(G)

        raise ValueError(f"OSMnx returned empty graph for '{city}'.")
    except Exception as e:
        logger.warning(f"Unable to download live OSM graph for '{city}': {e}. Using synthetic fallback city graph.")
        return create_synthetic_city_graph(city)




def create_synthetic_city_graph(city_name: str) -> nx.DiGraph:
    """
    Create a clean, deterministic synthetic directed city road network graph for offline dev & testing.
    """
    G = nx.DiGraph()
    # Central coordinates for synthetic city
    base_lat = 21.2514
    base_lng = 81.6296

    # Create grid of 25 nodes (5x5)
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

    # Create directed road edges connecting grid
    road_types = ["PRIMARY", "SECONDARY", "TERTIARY", "RESIDENTIAL"]
    road_names = ["Central Expressway", "Station Road", "Ring Road", "Civil Lines Road", "Market Street"]

    edge_counter = 50000001
    for row in range(5):
        for col in range(5):
            curr_node = node_mapping[(row, col)]
            # Connect right
            if col < 4:
                right_node = node_mapping[(row, col + 1)]
                r_type = road_types[(row + col) % len(road_types)]
                r_name = road_names[row % len(road_names)]
                G.add_edge(curr_node, right_node, key=0, osmid=edge_counter, name=r_name, highway=r_type, length=550.0, maxspeed=50)
                G.add_edge(right_node, curr_node, key=0, osmid=edge_counter + 1, name=r_name, highway=r_type, length=550.0, maxspeed=50)
                edge_counter += 2
            # Connect down
            if row < 4:
                down_node = node_mapping[(row + 1, col)]
                r_type = road_types[(row + col + 1) % len(road_types)]
                r_name = road_names[col % len(road_names)]
                G.add_edge(curr_node, down_node, key=0, osmid=edge_counter, name=r_name, highway=r_type, length=600.0, maxspeed=40)
                G.add_edge(down_node, curr_node, key=0, osmid=edge_counter + 1, name=r_name, highway=r_type, length=600.0, maxspeed=40)
                edge_counter += 2

    return G
