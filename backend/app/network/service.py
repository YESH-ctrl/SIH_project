import uuid
from typing import Dict, Any, List, Optional
import networkx as nx
from sqlalchemy.ext.asyncio import AsyncSession

from app.network.graph_builder import build_osm_road_network
from app.network.node_mapper import map_graph_nodes
from app.network.edge_mapper import map_graph_edges
from app.network.graph_validator import validate_and_compute_stats, run_dijkstra_shortest_path
from app.network.network_repository import NetworkRepository
from app.network.schemas import (
    NetworkStatsResponse,
    ShortestPathRouteRequest,
    ShortestPathRouteResponse,
    RoadNetworkDTO,
    NetworkNodeDTO,
    NetworkEdgeDTO,
)
from app.core.logging import logger


class NetworkService:
    _graph_cache: Dict[str, nx.DiGraph] = {}

    def __init__(self, db: AsyncSession):
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

        # 5. Cache runtime graph in memory
        self._graph_cache[network_id_str] = G

        # 6. Compute stats & validate graph
        stats = validate_and_compute_stats(G, network_id_str, net_model.name)
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
        models = await self.repo.get_network_nodes(network_id, page=page, page_size=page_size)
        return [NetworkNodeDTO.model_validate(m) for m in models]

    async def get_edges(self, network_id: str, page: int = 1, page_size: int = 50) -> List[NetworkEdgeDTO]:
        models = await self.repo.get_network_edges(network_id, page=page, page_size=page_size)
        return [NetworkEdgeDTO.model_validate(m) for m in models]

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
            raise ValueError("Graph has no nodes for routing.")

        # Determine source and target nodes
        source_node = None
        target_node = None

        if req.source_node_id and G.has_node(req.source_node_id):
            source_node = req.source_node_id
        elif req.source_lat is not None and req.source_lng is not None:
            source_node = self._find_nearest_node(G, req.source_lat, req.source_lng)
        else:
            source_node = nodes_list[0]

        if req.target_node_id and G.has_node(req.target_node_id):
            target_node = req.target_node_id
        elif req.target_lat is not None and req.target_lng is not None:
            target_node = self._find_nearest_node(G, req.target_lat, req.target_lng)
        else:
            target_node = nodes_list[-1] if len(nodes_list) > 1 else nodes_list[0]

        result = run_dijkstra_shortest_path(G, source_node, target_node, weight_key="travel_time")

        # Build path coordinates [[lat, lng], ...]
        path_coords = []
        for nid in result["path"]:
            ndata = G.nodes[nid]
            lat = float(ndata.get("y", ndata.get("lat", 0.0)))
            lng = float(ndata.get("x", ndata.get("lng", 0.0)))
            path_coords.append([lat, lng])

        dist_m = result["total_distance_meters"]
        time_s = result["total_travel_time_seconds"]

        return ShortestPathRouteResponse(
            network_id=network_id,
            source_node_id=str(source_node),
            target_node_id=str(target_node),
            node_path=[str(n) for n in result["path"]],
            edge_count=result["edge_count"],
            total_distance_meters=dist_m,
            total_distance_km=round(dist_m / 1000.0, 2),
            total_travel_time_seconds=time_s,
            total_travel_time_min=round(time_s / 60.0, 2),
            path_coordinates=path_coords,
        )

    async def _get_or_reconstruct_graph(self, network_id: str) -> nx.DiGraph:
        if network_id in self._graph_cache:
            return self._graph_cache[network_id]

        # Reconstruct graph from DB nodes and edges
        nodes = await self.repo.get_all_nodes(network_id)
        edges = await self.repo.get_all_edges(network_id)

        G = nx.DiGraph()
        if not nodes and not edges:
            # Generate fallback graph
            G = build_osm_road_network("Raipur, India")
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
