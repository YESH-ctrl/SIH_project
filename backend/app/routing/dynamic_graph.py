"""Dynamic routing graph.

Applies live edge costs (traffic engine + incident penalties + restrictions)
onto the static OSM graph. Only edges whose state changed get their cost
updated — no full network recalculation per GPS packet.
"""
import threading
import time
from typing import Dict, List, Optional, Tuple

import networkx as nx

from app.core.config import settings
from app.core.logging import logger


class DynamicRoutingGraph:
    """Wraps the cached static OSM DiGraph and overlays live costs."""

    def __init__(self):
        self._base_graph: Optional[nx.DiGraph] = None
        self._live_graph: Optional[nx.DiGraph] = None
        self._lock = threading.RLock()
        self._last_cost_update: float = 0.0
        self._changed_edges: set = set()
        self._city = "Raipur, India"

    def ensure_graph(self, city: str = "Raipur, India") -> bool:
        with self._lock:
            if self._live_graph is not None:
                return True
            try:
                from app.network.graph_builder import build_osm_road_network
                G = build_osm_road_network(city)
                self.load_graph(G)
                self._city = city
                logger.info("Dynamic routing graph ready (%d nodes, %d edges)",
                            len(self._live_graph.nodes), len(self._live_graph.edges))
                return True
            except Exception as exc:
                logger.error("Dynamic routing graph build failed: %s", exc)
                return False

    def load_graph(self, G: nx.DiGraph) -> None:
        """Install a base graph + live overlay. Node ids are normalized to
        strings so edge ids ('u->v') from the map matcher always resolve."""
        with self._lock:
            G_str = nx.relabel_nodes(G, {n: str(n) for n in G.nodes})
            self._base_graph = G_str
            self._live_graph = G_str.copy()

    # ------------------------------------------------------------ cost update
    def apply_edge_state(self, edge_id: str, observed_kmh: Optional[float],
                         free_flow_kmh: float, level: str, blocked: bool = False,
                         incident_severity: Optional[str] = None) -> bool:
        """Update the cost of ONE edge. Returns True if the live graph changed."""
        if self._live_graph is None:
            return False
        if "->" not in str(edge_id):
            return False
        u, v = str(edge_id).split("->", 1)
        with self._lock:
            if not self._live_graph.has_edge(u, v):
                return False
            data = self._live_graph[u][v]

            if blocked:
                # Effectively infinite cost but finite float for Dijkstra safety
                data["travel_time"] = 1e9
                data["congestion_penalty"] = 1e9
                data["incident_penalty"] = 1e9
                data["blocked"] = True
            else:
                free_time = float(data.get("free_flow_time", data.get("travel_time", 60.0)))
                if observed_kmh is not None and observed_kmh > 0:
                    dynamic_time = float(data.get("length", 300.0)) / max(observed_kmh / 3.6, settings.TRAFFIC_MIN_SPEED_KMH / 3.6)
                else:
                    dynamic_time = free_time  # UNKNOWN: fall back to free flow, flagged
                ratio = observed_kmh / max(free_flow_kmh, 1.0) if observed_kmh else 1.0
                congestion_penalty = max(0.0, dynamic_time - free_time)
                incident_penalty = self._incident_penalty(incident_severity)
                data["travel_time"] = dynamic_time + incident_penalty
                data["congestion_penalty"] = round(congestion_penalty, 2)
                data["incident_penalty"] = incident_penalty
                data["blocked"] = False
                data["traffic_level"] = level
                data["traffic_ratio"] = round(ratio, 3)
            data["cost_updated_at"] = time.time()
            self._changed_edges.add(edge_id)
            self._last_cost_update = time.time()
            return True

    @staticmethod
    def _incident_penalty(severity: Optional[str]) -> float:
        if severity is None:
            return 0.0
        sev = severity.upper()
        if sev in ("SEVERE", "HIGH"):
            return settings.QPSO_INCIDENT_PENALTY_S
        if sev == "MODERATE":
            return settings.QPSO_INCIDENT_PENALTY_S * 0.5
        return settings.QPSO_INCIDENT_PENALTY_S * 0.2

    def apply_incident_block(self, edge_ids: List[str], blocked: bool = True) -> int:
        n = 0
        for eid in edge_ids:
            if self.apply_edge_state(eid, None, 0, "BLOCKED" if blocked else "UNKNOWN", blocked=blocked):
                n += 1
        return n

    def sync_from_traffic_engine(self, changed_states) -> int:
        """Incremental: apply only edges whose state changed."""
        n = 0
        for s in changed_states:
            blocked = s.level == "BLOCKED"
            if self.apply_edge_state(
                s.edge_id, s.observed_kmh, s.free_flow_kmh,
                "BLOCKED" if blocked else s.level, blocked=blocked,
            ):
                n += 1
        return n

    # ---------------------------------------------------------------- routing
    def route(self, source_node: str, target_node: str) -> Optional[dict]:
        """Dijkstra/A* over the live graph. Returns route dict with geometry."""
        if self._live_graph is None and not self.ensure_graph():
            return None
        try:
            path = nx.dijkstra_path(self._live_graph, str(source_node), str(target_node), weight="travel_time")
        except (nx.NetworkXNoPath, nx.NodeNotFound):
            return None

        edges_used: List[str] = []
        total_time = 0.0
        total_len = 0.0
        coords = []
        for a, b in zip(path[:-1], path[1:]):
            data = self._live_graph[a][b]
            total_time += float(data.get("travel_time", 60.0))
            total_len += float(data.get("length", 100.0))
            edges_used.append(f"{a}->{b}")
            coords.append([float(self._live_graph.nodes[a]["x"]), float(self._live_graph.nodes[a]["y"])])
        if path:
            last = self._live_graph.nodes[path[-1]]
            coords.append([float(last["x"]), float(last["y"])])

        return {
            "node_ids": path,
            "edge_ids": edges_used,
            "distance_meters": round(total_len, 1),
            "travel_time_seconds": round(total_time, 1),
            "geometry": {"type": "LineString", "coordinates": coords},
            "algorithm": "dijkstra_dynamic",
        }

    def route_with_alternative(self, source_node: str, target_node: str) -> Tuple[Optional[dict], Optional[dict]]:
        """Primary route + a penalised alternative (for QPSO candidate diversity)."""
        primary = self.route(source_node, target_node)
        alt = None
        if primary and primary["edge_ids"]:
            with self._lock:
                bumped: List[Tuple[str, str, float]] = []
                try:
                    for eid in primary["edge_ids"][:5]:
                        u, v = eid.split("->", 1)
                        if self._live_graph.has_edge(u, v):
                            old = self._live_graph[u][v].get("travel_time", 60.0)
                            self._live_graph[u][v]["travel_time"] = old * 2.2
                            bumped.append((u, v, old))
                    alt = self.route(source_node, target_node)
                finally:
                    for u, v, old in bumped:
                        self._live_graph[u][v]["travel_time"] = old
        return primary, alt

    def node_coords(self, node_id: str) -> Optional[Tuple[float, float]]:
        if self._live_graph is None:
            return None
        try:
            n = self._live_graph.nodes[str(node_id)]
            return (float(n["y"]), float(n["x"]))
        except (KeyError, TypeError):
            return None

    def nearest_node(self, lat: float, lng: float) -> Optional[str]:
        if self._live_graph is None and not self.ensure_graph():
            return None
        try:
            from app.network.routing import find_nearest_node
            return find_nearest_node(self._live_graph, lat, lng)["node_id"]
        except Exception:
            return None

    # -------------------------------------------------------------- accessors
    @property
    def graph(self) -> Optional[nx.DiGraph]:
        return self._live_graph

    def stats(self) -> dict:
        return {
            "ready": self._live_graph is not None,
            "nodes": len(self._live_graph.nodes) if self._live_graph else 0,
            "edges": len(self._live_graph.edges) if self._live_graph else 0,
            "edges_with_live_cost": len(self._changed_edges),
            "last_cost_update": self._last_cost_update,
        }

    def reset(self) -> None:
        with self._lock:
            self._live_graph = self._base_graph.copy() if self._base_graph else None
            self._changed_edges = set()


def normalize_node_ids(G: nx.DiGraph) -> nx.DiGraph:
    """Utility: string-keyed copy of a graph (used by tests and adapters)."""
    return nx.relabel_nodes(G, {n: str(n) for n in G.nodes})


dynamic_routing_graph = DynamicRoutingGraph()
