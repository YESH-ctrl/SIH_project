"""GPS map matching against the imported OSM road network.

Every GPS point → candidate nearby road edges (spatial grid index) →
distance + heading + speed compatibility scoring → best edge + confidence.

No hard-coded road names or edge IDs: works across the entire imported
network, including intersections, parallel lanes, stopped vehicles, U-turns
and moderate off-road drift (low-accuracy fixes widen the search radius).
"""
import math
import threading
import time
from dataclasses import dataclass, field
from typing import Dict, List, Optional, Tuple

import networkx as nx

from app.core.config import settings
from app.core.logging import logger


@dataclass
class EdgeGeometry:
    """One directed edge with cached geometry for matching."""

    edge_id: str          # graph node-pair id "u->v"
    u: str
    v: str
    lat_u: float
    lng_u: float
    lat_v: float
    lng_v: float
    length_m: float
    speed_kph: float
    road_name: str
    highway: str
    polyline: List[Tuple[float, float]]  # dense (lat, lng) samples along the edge


@dataclass
class MatchResult:
    edge_id: str
    u: str
    v: str
    network_id: str
    fraction: float          # 0..1 along the edge
    distance_m: float        # perpendicular distance to the edge polyline
    confidence: float        # 0..1
    road_name: str
    edge_speed_kph: float
    matched_lat: float
    matched_lng: float
    candidates_considered: int = 0


def _haversine_m(lat1: float, lng1: float, lat2: float, lng2: float) -> float:
    R = 6371000.0
    phi1, phi2 = math.radians(lat1), math.radians(lat2)
    dphi = math.radians(lat2 - lat1)
    dlam = math.radians(lng2 - lng1)
    a = math.sin(dphi / 2) ** 2 + math.cos(phi1) * math.cos(phi2) * math.sin(dlam / 2) ** 2
    return R * 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))


def _project_point_to_segment(
    p_lat: float, p_lng: float, a_lat: float, a_lng: float, b_lat: float, b_lng: float
) -> Tuple[float, float, float]:
    """Project point onto segment AB in local-equirectangular metres.
    Returns (distance_m, fraction, proj_lat, proj_lng)."""
    # Local flat projection around the segment midpoint.
    mid_lat = (a_lat + b_lat) / 2.0
    k = math.cos(math.radians(mid_lat)) * 111320.0
    m_per_deg = 111320.0
    ax, ay = a_lng * k, a_lat * m_per_deg
    bx, by = b_lng * k, b_lat * m_per_deg
    px, py = p_lng * k, p_lat * m_per_deg
    dx, dy = bx - ax, by - ay
    seg_len2 = dx * dx + dy * dy
    if seg_len2 < 1e-9:
        return _haversine_m(p_lat, p_lng, a_lat, a_lng), 0.0, a_lat, a_lng
    t = ((px - ax) * dx + (py - ay) * dy) / seg_len2
    t = max(0.0, min(1.0, t))
    cx, cy = ax + t * dx, ay + t * dy
    dist = math.hypot(px - cx, py - cy)
    proj_lat = (cy) / m_per_deg
    proj_lng = (cx) / k
    return dist, t, proj_lat, proj_lng


class OSMMapMatcher:
    """Matches GPS points to OSM edges using a grid spatial index.

    The graph is the *existing* `build_osm_road_network()` product, so node/edge
    ids are the same ones used by routing and the frontend network map.
    """

    def __init__(self, network_id: str = "default"):
        self.network_id = network_id
        self._G: Optional[nx.DiGraph] = None
        self._grid: Dict[Tuple[int, int], List[int]] = {}
        self._edges: List[EdgeGeometry] = []
        self._cell_size_m = 120.0
        self._origin = (21.0, 81.0)  # replaced at build time
        self._lock = threading.RLock()
        self._built_at: float = 0.0
        self._last_vehicle_edge: Dict[str, str] = {}

    # ------------------------------------------------------------------ build
    def ensure_graph(self, city: str = "Raipur, India") -> bool:
        """Load and index the OSM graph once; rebuild if the underlying graph was reloaded."""
        with self._lock:
            if self._G is not None and self._edges:
                return True
            try:
                from app.network.graph_builder import build_osm_road_network
                t0 = time.time()
                G = build_osm_road_network(city)
                self._build_index(G)
                self._built_at = time.time()
                logger.info(
                    "Map matcher ready: %d edges indexed in %.1fs (network=%s)",
                    len(self._edges), self._built_at - t0, self.network_id,
                )
                return True
            except Exception as exc:
                logger.error("Map matcher graph build failed: %s", exc)
                self._G = None
                return False

    def _build_index(self, G: nx.DiGraph) -> None:
        self._G = G
        self._edges = []
        lats, lngs = [], []

        for u, v, data in G.edges(data=True):
            try:
                n_u, n_v = G.nodes[u], G.nodes[v]
                lat_u, lng_u = float(n_u.get("y", 0.0)), float(n_u.get("x", 0.0))
                lat_v, lng_v = float(n_v.get("y", 0.0)), float(n_v.get("x", 0.0))
            except (KeyError, TypeError):
                continue

            road_name = data.get("name") or data.get("road_name") or "Unnamed Road"
            if isinstance(road_name, list):
                road_name = road_name[0] if road_name else "Unnamed Road"
            speed_kph = float(data.get("speed_limit_kph", data.get("maxspeed", 40)) or 40)
            length_m = float(data.get("length", _haversine_m(lat_u, lng_u, lat_v, lng_v)) or 1)

            geom_attr = data.get("geometry")
            polyline: List[Tuple[float, float]] = []
            if geom_attr is not None:
                try:
                    coords = list(geom_attr.coords) if hasattr(geom_attr, "coords") else geom_attr
                    if coords and len(coords) >= 2:
                        # shapely coords are (lng, lat)
                        if hasattr(geom_attr, "coords") or (isinstance(coords[0], (list, tuple)) and coords[0][0] > coords[0][1] and coords[0][0] > 60):
                            polyline = [(c[1], c[0]) for c in coords]
                        else:
                            polyline = [(c[0], c[1]) for c in coords]
                except Exception:
                    polyline = []

            if not polyline:
                polyline = [(lat_u, lng_u), (lat_v, lng_v)]

            edge = EdgeGeometry(
                edge_id=f"{u}->{v}",
                u=str(u),
                v=str(v),
                lat_u=lat_u, lng_u=lng_u, lat_v=lat_v, lng_v=lng_v,
                length_m=length_m,
                speed_kph=speed_kph,
                road_name=str(road_name),
                highway=str(data.get("highway", "unclassified")),
                polyline=polyline,
            )
            idx = len(self._edges)
            self._edges.append(edge)
            lats.append(lat_u); lats.append(lat_v)
            lngs.append(lng_u); lngs.append(lng_v)

            # Register the edge in every grid cell its bbox touches.
            min_lat, max_lat = min(lat_u, lat_v), max(lat_u, lat_v)
            min_lng, max_lng = min(lng_u, lng_v), max(lng_u, lng_v)
            for cx in self._cells_for_range(min_lat, max_lat):
                for cy in self._cells_for_range(min_lng, max_lng):
                    self._grid.setdefault((cx, cy), []).append(idx)

        if lats:
            self._origin = (min(lats), min(lngs))

    def _cells_for_range(self, lo: float, hi: float) -> range:
        size = self._cell_size_m / 111320.0  # degrees
        return range(int(math.floor(lo / size)), int(math.floor(hi / size)) + 1)

    def _cell(self, lat: float, lng: float) -> Tuple[int, int]:
        size = self._cell_size_m / 111320.0
        return (int(math.floor(lat / size)), int(math.floor(lng / size)))

    # ------------------------------------------------------------------ match
    def match(
        self,
        lat: float,
        lng: float,
        heading_deg: Optional[float] = None,
        speed_kmh: Optional[float] = None,
        accuracy_m: Optional[float] = None,
        vehicle_id: Optional[str] = None,
    ) -> Optional[MatchResult]:
        if self._G is None and not self.ensure_graph():
            return None

        with self._lock:
            if not self._edges:
                return None

        # Low accuracy → wider search radius (GPS noise / off-road drift).
        radius = settings.MAP_MATCH_SEARCH_RADIUS_M
        if accuracy_m is not None:
            radius = min(120.0, max(radius, accuracy_m * 2.0))

        candidates = self._candidate_edges(lat, lng, radius)
        if not candidates:
            return None

        best: Optional[Tuple[float, float, float, float, float, EdgeGeometry]] = None
        for idx in candidates:
            edge = self._edges[idx]
            dist, fraction, proj_lat, proj_lng = self._distance_to_edge(lat, lng, edge)
            if dist > radius:
                continue
            score = self._score(dist, edge, heading_deg, speed_kmh, vehicle_id, fraction)
            if best is None or score > best[0]:
                best = (score, dist, fraction, proj_lat, proj_lng, edge)

        if best is None:
            return None

        score, dist, fraction, proj_lat, proj_lng, edge = best
        confidence = self._confidence(score, dist, radius, len(candidates))
        if confidence < settings.MAP_MATCH_MIN_CONFIDENCE:
            return None

        if vehicle_id:
            self._last_vehicle_edge[vehicle_id] = edge.edge_id

        return MatchResult(
            edge_id=edge.edge_id,
            u=edge.u,
            v=edge.v,
            network_id=self.network_id,
            fraction=round(fraction, 4),
            distance_m=round(dist, 1),
            confidence=round(confidence, 3),
            road_name=edge.road_name,
            edge_speed_kph=edge.speed_kph,
            matched_lat=proj_lat,
            matched_lng=proj_lng,
            candidates_considered=len(candidates),
        )

    # ------------------------------------------------------------- internals
    def _candidate_edges(self, lat: float, lng: float, radius_m: float) -> List[int]:
        cell_radius = int(math.ceil(radius_m / self._cell_size_m)) + 1
        cx, cy = self._cell(lat, lng)
        out: List[int] = []
        seen: set = set()
        for dx in range(-cell_radius, cell_radius + 1):
            for dy in range(-cell_radius, cell_radius + 1):
                for idx in self._grid.get((cx + dx, cy + dy), ()):
                    if idx not in seen:
                        seen.add(idx)
                        out.append(idx)
        # If a dense grid yields too many candidates, keep the ones closest to
        # the query point (never blind-truncate, which drops the true match).
        cap = settings.MAP_MATCH_MAX_CANDIDATES * 50
        if len(out) > cap:
            out.sort(key=lambda i: min(
                _haversine_m(lat, lng, self._edges[i].lat_u, self._edges[i].lng_u),
                _haversine_m(lat, lng, self._edges[i].lat_v, self._edges[i].lng_v),
            ))
            out = out[:cap]
        return out

    def _distance_to_edge(self, lat: float, lng: float, edge: EdgeGeometry) -> Tuple[float, float, float, float]:
        best_dist, best_frac, best_lat, best_lng = float("inf"), 0.0, edge.lat_u, edge.lng_u
        pts = edge.polyline
        cum = 0.0
        seg_lens = []
        for i in range(len(pts) - 1):
            seg_len = _haversine_m(pts[i][0], pts[i][1], pts[i + 1][0], pts[i + 1][1])
            seg_lens.append(max(seg_len, 0.1))
        total = sum(seg_lens) or 1.0
        for i in range(len(pts) - 1):
            d, t, plat, plng = _project_point_to_segment(
                lat, lng, pts[i][0], pts[i][1], pts[i + 1][0], pts[i + 1][1]
            )
            if d < best_dist:
                frac = (cum + t * seg_lens[i]) / total if i < len(seg_lens) else t
                best_dist, best_frac, best_lat, best_lng = d, frac, plat, plng
            cum += seg_lens[i]
        return best_dist, best_frac, best_lat, best_lng

    def _score(
        self,
        dist_m: float,
        edge: EdgeGeometry,
        heading_deg: Optional[float],
        speed_kmh: Optional[float],
        vehicle_id: Optional[str],
        fraction: float,
    ) -> float:
        """Higher is better. Combines distance, heading compatibility, speed
        compatibility and route continuity (previous matched edge)."""
        # Distance: 0 m → 1.0, at radius → ~0.1
        dist_score = math.exp(-3.0 * dist_m / max(self._cell_size_m, 30.0))
        score = dist_score

        # Heading compatibility (angle difference; ignore when stopped)
        if heading_deg is not None and speed_kmh is not None and speed_kmh > 3.0:
            bear = math.degrees(math.atan2(
                edge.lng_v - edge.lng_u, edge.lat_v - edge.lat_u
            )) % 360.0
            diff = abs((heading_deg - bear + 180.0) % 360.0 - 180.0)
            head_score = math.cos(math.radians(diff))  # 1 aligned, -1 opposite
            score += 0.35 * max(0.0, head_score)

        # Speed compatibility: avoid matching a slow vehicle onto a motorway
        if speed_kmh is not None and edge.speed_kph > 0:
            ratio = speed_kmh / edge.speed_kph
            if 0.2 <= ratio <= 1.5:
                score += 0.15
            elif ratio > 2.0:
                score -= 0.10

        # Continuity: vehicles rarely teleport to a disjoint edge
        prev = self._last_vehicle_edge.get(vehicle_id) if vehicle_id else None
        if prev is not None:
            if prev.split("->")[0] == edge.v or prev.split("->")[1] == edge.u:
                score += 0.25
            elif prev == edge.edge_id:
                score += 0.35

        return score

    def _confidence(self, score: float, dist_m: float, radius_m: float, n_candidates: int) -> float:
        conf = min(1.0, score / 1.6)
        if dist_m > radius_m * 0.6:
            conf *= 0.6
        if n_candidates <= 1:
            conf *= 0.85
        return max(0.0, min(1.0, conf))

    # ------------------------------------------------------------- utilities
    def get_edge(self, edge_id: str) -> Optional[EdgeGeometry]:
        for e in self._edges:
            if e.edge_id == edge_id:
                return e
        return None

    def edge_by_index(self, idx: int) -> Optional[EdgeGeometry]:
        if 0 <= idx < len(self._edges):
            return self._edges[idx]
        return None

    def stats(self) -> dict:
        return {
            "indexed": bool(self._edges),
            "edge_count": len(self._edges),
            "network_id": self.network_id,
            "built_at": self._built_at,
        }

    def reset(self) -> None:
        with self._lock:
            self._G = None
            self._edges = []
            self._grid = {}
            self._last_vehicle_edge = {}


# Module-level singleton
osm_map_matcher = OSMMapMatcher()


def get_map_matcher() -> OSMMapMatcher:
    """Return the shared matcher, building the graph index on first use."""
    if not osm_map_matcher._edges:
        osm_map_matcher.ensure_graph()
    return osm_map_matcher
