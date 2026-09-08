import uuid
from typing import Dict, Any, List, Optional
import networkx as nx
from sqlalchemy.ext.asyncio import AsyncSession

from app.network.graph_builder import build_osm_road_network
from app.network.node_mapper import map_graph_nodes
from app.network.edge_mapper import map_graph_edges
from app.network.graph_validator import validate_and_compute_stats, run_dijkstra_shortest_path
from app.network.network_repository import NetworkRepository
from app.network.routing import compute_shortest_path, find_nearest_node
from app.network.schemas import (
    NetworkStatsResponse,
    ShortestPathRouteRequest,
    ShortestPathRouteResponse,
    NearestNodeRequest,
    NearestNodeResponse,
    RoadNetworkDTO,
    NetworkNodeDTO,
    NetworkEdgeDTO,
)
from app.core.logging import logger


class NetworkService:
    _graph_cache: Dict[str, nx.DiGraph] = {}

    def __init__(self, db: Optional[AsyncSession] = None):
        self.db = db
        self.repo = NetworkRepository(db)

    async def import_osm_network(
        self,
        organization_id: str,
        city: str = "Raipur, India",
        network_type: str = "drive",
        version: str = "v1.0"
    ) -> NetworkStatsResponse:
        """
        Import OSM road network for city, construct weighted directed graph,
        persist to Supabase, and return graph statistics.
        """
        logger.info(f"Importing OSM road network for org={organization_id}, city='{city}'...")

        # 1. Build and weight graph
        G = build_osm_road_network(city, network_type=network_type)

        # 2. Get or create RoadNetwork record in DB
        net_model, created = await self.repo.get_or_create_road_network(
            organization_id=organization_id,
            name=f"{city} Road Network",
            source="OSM",
            version=version
        )
        network_id_str = str(net_model.id)

        # 3. Map nodes and edges
        node_models, osm_to_uuid = map_graph_nodes(G, network_id_str)
        edge_models = map_graph_edges(G, network_id_str, osm_to_uuid)

        # 4. Persist to DB
        n_count, e_count = await self.repo.save_nodes_and_edges(net_model.id, node_models, edge_models)
        logger.info(f"Persisted {n_count} nodes and {e_count} edges to Supabase for network '{net_model.name}'.")

        # 5. Relabel graph nodes to string UUIDs matching DB models and cache runtime graph
        G_uuid = nx.relabel_nodes(G, {osm_id: str(uuid_val) for osm_id, uuid_val in osm_to_uuid.items()})
        self._graph_cache[network_id_str] = G_uuid

        # 6. Compute stats & validate graph
        stats = validate_and_compute_stats(G_uuid, network_id_str, net_model.name)
        return stats

    async def get_networks(self, organization_id: str) -> List[RoadNetworkDTO]:
        models = await self.repo.get_networks_by_org(organization_id)
        return [RoadNetworkDTO.model_validate(m) for m in models]

    async def get_network(self, network_id: str, organization_id: str) -> Optional[RoadNetworkDTO]:
        model = await self.repo.get_network_by_id(network_id, organization_id)
        if not model:
            return None
        return RoadNetworkDTO.model_validate(model)

    async def get_network_stats(self, network_id: str, organization_id: str) -> NetworkStatsResponse:
        net = await self.repo.get_network_by_id(network_id, organization_id)
        if not net:
            raise ValueError(f"Road network '{network_id}' not found.")

        G = await self._get_or_reconstruct_graph(network_id)
        return validate_and_compute_stats(G, network_id, net.name)

    async def get_nodes(self, network_id: str, page: int = 1, page_size: int = 50) -> List[NetworkNodeDTO]:
        if self.db:
            try:
                models = await self.repo.get_network_nodes(network_id, page=page, page_size=page_size)
                if models:
                    return [NetworkNodeDTO.model_validate(m) for m in models]
            except Exception:
                pass

        G = await self._get_or_reconstruct_graph(network_id)
        all_nodes = list(G.nodes(data=True))
        start = (page - 1) * page_size
        end = start + page_size
        paged = all_nodes[start:end]

        dtos = []
        for nid, data in paged:
            lat = float(data.get("y", data.get("lat", 21.2514)))
            lng = float(data.get("x", data.get("lng", 81.6296)))
            dtos.append(NetworkNodeDTO(
                id=str(nid),
                network_id=network_id,
                external_id=str(data.get("external_id", nid)),
                lat=lat,
                lng=lng
            ))
        return dtos

    async def get_edges(self, network_id: str, page: int = 1, page_size: int = 50) -> List[NetworkEdgeDTO]:
        if self.db:
            try:
                models = await self.repo.get_network_edges(network_id, page=page, page_size=page_size)
                if models:
                    return [NetworkEdgeDTO.model_validate(m) for m in models]
            except Exception:
                pass

        G = await self._get_or_reconstruct_graph(network_id)
        all_edges = list(G.edges(data=True))
        start = (page - 1) * page_size
        end = start + page_size
        paged = all_edges[start:end]

        dtos = []
        for u, v, data in paged:
            e_id = str(data.get("id", f"edge_{u}_{v}"))
            road_name = str(data.get("road_name", data.get("name", "Urban Road")))
            if isinstance(road_name, list):
                road_name = road_name[0]
            length = float(data.get("length", 100.0))
            speed = float(data.get("speed_limit_kph", 40.0))
            road_type = str(data.get("road_type", data.get("highway", "residential"))).upper()
            geom = data.get("geometry")
            if isinstance(geom, dict):
                geom_dict = geom
            else:
                u_data = G.nodes[u]
                v_data = G.nodes[v]
                u_lat = float(u_data.get("y", u_data.get("lat", 21.2514)))
                u_lng = float(u_data.get("x", u_data.get("lng", 81.6296)))
                v_lat = float(v_data.get("y", v_data.get("lat", 21.2514)))
                v_lng = float(v_data.get("x", v_data.get("lng", 81.6296)))
                geom_dict = {"type": "LineString", "coordinates": [[u_lng, u_lat], [v_lng, v_lat]]}

            dtos.append(NetworkEdgeDTO(
                id=e_id,
                network_id=network_id,
                external_id=e_id,
                from_node_id=str(u),
                to_node_id=str(v),
                road_name=road_name,
                length_meters=length,
                speed_limit_kph=speed,
                road_type=road_type,
                capacity_vehicles=50,
                geometry=geom_dict
            ))
        return dtos



    async def get_nearest_node(
        self,
        network_id: str,
        organization_id: str,
        lat: float,
        lng: float
    ) -> NearestNodeResponse:
        net = await self.repo.get_network_by_id(network_id, organization_id)
        if not net:
            raise ValueError(f"Road network '{network_id}' not found.")

        G = await self._get_or_reconstruct_graph(network_id)
        res = find_nearest_node(G, lat, lng)
        return NearestNodeResponse(
            node_id=res["node_id"],
            latitude=res["latitude"],
            longitude=res["longitude"],
            distance_meters=res["distance_meters"]
        )

    async def calculate_shortest_path(
        self,
        network_id: str,
        organization_id: str,
        req: ShortestPathRouteRequest
    ) -> ShortestPathRouteResponse:
        net = await self.repo.get_network_by_id(network_id, organization_id)
        if not net:
            raise ValueError(f"Road network '{network_id}' not found.")

        G = await self._get_or_reconstruct_graph(network_id)
        nodes_list = list(G.nodes)
        if not nodes_list:
            raise ValueError(f"Graph has no nodes for routing in network '{network_id}'.")

        # Determine source and target nodes
        source_node = None
        target_node = None

        if req.source_node_id is not None:
            src_str = str(req.source_node_id)
            if not G.has_node(src_str):
                raise ValueError(f"Source node '{src_str}' does not exist in network '{network_id}'.")
            source_node = src_str
        elif req.source_lat is not None and req.source_lng is not None:
            near_src = find_nearest_node(G, req.source_lat, req.source_lng)
            source_node = near_src["node_id"]
        else:
            source_node = str(nodes_list[0])

        if req.target_node_id is not None:
            tgt_str = str(req.target_node_id)
            if not G.has_node(tgt_str):
                raise ValueError(f"Target node '{tgt_str}' does not exist in network '{network_id}'.")
            target_node = tgt_str
        elif req.target_lat is not None and req.target_lng is not None:
            near_tgt = find_nearest_node(G, req.target_lat, req.target_lng)
            target_node = near_tgt["node_id"]
        else:
            target_node = str(nodes_list[-1]) if len(nodes_list) > 1 else str(nodes_list[0])

        res = compute_shortest_path(G, network_id, source_node, target_node, weight_key="travel_time")
        return ShortestPathRouteResponse.model_validate(res)

    async def _get_or_reconstruct_graph(self, network_id: str) -> nx.DiGraph:
        if network_id in self._graph_cache:
            return self._graph_cache[network_id]

        nodes = []
        edges = []
        if self.db:
            try:
                nodes = await self.repo.get_all_nodes(network_id)
                edges = await self.repo.get_all_edges(network_id)
            except Exception:
                pass

        G = nx.DiGraph()
        if not nodes and not edges:
            # Fallback graph for un-persisted demo networks
            G_raw = build_osm_road_network("Raipur, India")
            # Convert raw nodes to string node IDs
            G = nx.relabel_nodes(G_raw, {n: str(n) for n in G_raw.nodes})
            self._graph_cache[network_id] = G
            return G


        for n in nodes:
            G.add_node(str(n.id), y=float(n.lat), x=float(n.lng), external_id=n.external_id)

        for e in edges:
            u = str(e.from_node_id)
            v = str(e.to_node_id)
            length = float(e.length_meters)
            speed = float(e.speed_limit_kph)
            speed_mps = max(0.1, speed / 3.6)
            travel_time = max(0.1, round(length / speed_mps, 3))

            G.add_edge(
                u, v,
                id=str(e.id),
                road_name=e.road_name,
                length=length,
                speed_limit_kph=speed,
                road_type=e.road_type,
                capacity_vehicles=e.capacity_vehicles,
                travel_time=travel_time,
                free_flow_time=travel_time,
                geometry=e.geometry,
            )

        self._graph_cache[network_id] = G
        return G

    def _find_nearest_node(self, G: nx.DiGraph, lat: float, lng: float) -> Any:
        best_node = None
        best_dist_sq = float("inf")

        for nid, data in G.nodes(data=True):
            n_lat = float(data.get("y", data.get("lat", 0.0)))
            n_lng = float(data.get("x", data.get("lng", 0.0)))
            dist_sq = (n_lat - lat) ** 2 + (n_lng - lng) ** 2
            if dist_sq < best_dist_sq:
                best_dist_sq = dist_sq
                best_node = nid

        return best_node
