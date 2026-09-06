import uuid
from typing import Dict, List, Any
import networkx as nx

try:
    from shapely.geometry import mapping as shapely_mapping
except ImportError:
    shapely_mapping = None

from app.infrastructure.database.models.network import NetworkEdge


def map_graph_edges(
    G: nx.DiGraph,
    network_id: str,
    osm_to_uuid: Dict[Any, uuid.UUID]
) -> List[NetworkEdge]:
    """
    Map NetworkX directed graph edges to Q-FLOW NetworkEdge DB models.
    References internal node UUIDs for from_node_id and to_node_id.
    """
    network_uuid = uuid.UUID(network_id) if isinstance(network_id, str) else network_id
    edge_models: List[NetworkEdge] = []

    for u, v, data in G.edges(data=True):
        from_uuid = osm_to_uuid.get(u)
        to_uuid = osm_to_uuid.get(v)
        if not from_uuid or not to_uuid:
            continue

        key = data.get("key", 0)
        osmid = data.get("osmid", "")
        external_id = f"way_{osmid}_{u}_{v}_{key}"

        edge_uuid = uuid.uuid5(network_uuid, f"edge_{external_id}")

        # Road name fallback
        raw_name = data.get("name")
        if isinstance(raw_name, list):
            road_name = " / ".join([str(n) for n in raw_name if n])
        elif raw_name:
            road_name = str(raw_name)
        else:
            road_name = "Unnamed Road"

        length_meters = float(data.get("length", 1000.0))
        speed_limit_kph = float(data.get("speed_limit_kph", 50.0))
        road_type = str(data.get("road_type", "UNCLASSIFIED"))
        capacity_vehicles = int(data.get("capacity_vehicles", 200))

        # Geometry GeoJSON extraction if available
        geom_json = None
        geom_obj = data.get("geometry")
        if geom_obj and shapely_mapping:
            try:
                geom_json = shapely_mapping(geom_obj)
            except Exception:
                geom_json = None

        model = NetworkEdge(
            id=edge_uuid,
            network_id=network_uuid,
            external_id=external_id,
            from_node_id=from_uuid,
            to_node_id=to_uuid,
            road_name=road_name,
            length_meters=length_meters,
            speed_limit_kph=speed_limit_kph,
            road_type=road_type,
            capacity_vehicles=capacity_vehicles,
            geometry=geom_json,
        )
        edge_models.append(model)

    return edge_models
