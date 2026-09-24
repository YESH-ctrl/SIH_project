import uuid
from typing import Dict, List, Tuple, Any
import networkx as nx

from app.infrastructure.database.models.network import NetworkNode


def map_graph_nodes(G: nx.DiGraph, network_id: str) -> Tuple[List[NetworkNode], Dict[Any, uuid.UUID]]:
    """
    Map NetworkX graph nodes to Q-FLOW NetworkNode DB models.
    Preserves external OSM node IDs and generates deterministic internal UUIDs.
    Returns (node_models, osm_to_uuid_map).
    """
    network_uuid = uuid.UUID(network_id) if isinstance(network_id, str) else network_id
    node_models: List[NetworkNode] = []
    osm_to_uuid: Dict[Any, uuid.UUID] = {}

    for node_id, data in G.nodes(data=True):
        external_id = str(node_id)
        # Generate deterministic UUID based on network_id + external_id
        node_uuid = uuid.uuid5(network_uuid, f"node_{external_id}")
        osm_to_uuid[node_id] = node_uuid

        # Extract lat/lng (OSMnx uses 'y' for lat, 'x' for lng)
        lat = float(data.get("y", data.get("lat", 0.0)))
        lng = float(data.get("x", data.get("lng", 0.0)))

        model = NetworkNode(
            id=node_uuid,
            network_id=network_uuid,
            external_id=external_id,
            lat=lat,
            lng=lng,
        )
        node_models.append(model)

    return node_models, osm_to_uuid
