import networkx as nx
from app.network.osm_loader import load_osm_graph_from_place
from app.network.weight_calculator import apply_static_weights
from app.core.logging import logger


def build_osm_road_network(city: str, network_type: str = "drive") -> nx.DiGraph:
    """
    Build, normalize, and weight an OSM road network graph for a city.
    Returns an annotated NetworkX DiGraph.
    """
    logger.info(f"Building OSM road network graph for city: '{city}'...")
    raw_graph = load_osm_graph_from_place(city, network_type=network_type)
    weighted_graph = apply_static_weights(raw_graph)
    logger.info(f"OSM road network graph built successfully ({len(weighted_graph.nodes)} nodes, {len(weighted_graph.edges)} edges).")
    return weighted_graph
