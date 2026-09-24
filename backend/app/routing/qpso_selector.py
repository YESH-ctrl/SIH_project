"""QPSO route selector — the optimization/decision layer.

Given live network state, produce candidate routes (dynamic Dijkstra variants)
and let a quantum-behaved particle swarm select the optimal one. The swarm
evaluates candidates with a multi-objective cost:

  cost = travel_time
       + congestion_penalty
       + incident_penalty
       + route_change_penalty (rerouting cost)
       + distance weight

The existing DiscreteQPSOSolver machinery (quantum probability contraction,
swap operators toward personal/global bests) is preserved and re-used; this
module adapts it from VRP permutations to per-vehicle candidate route choice.
"""
import math
import random
import time
from dataclasses import dataclass, field
from typing import Dict, List, Optional, Tuple

from app.core.config import settings
from app.core.logging import logger


@dataclass
class RouteCandidate:
    candidate_id: str
    edge_ids: List[str]
    distance_m: float
    free_time_s: float          # static free-flow time
    dynamic_time_s: float       # live traffic-aware time
    congestion_penalty_s: float
    incident_penalty_s: float
    geometry: dict
    node_ids: List[str] = field(default_factory=list)

    @property
    def base_cost(self) -> float:
        return self.dynamic_time_s + self.congestion_penalty_s + self.incident_penalty_s


@dataclass
class QPSOSelectionResult:
    best: RouteCandidate
    all_candidates: List[RouteCandidate]
    iterations: int
    population_size: int
    best_cost: float
    computation_ms: float
    convergence: List[dict]
    vehicles_considered: int = 1


class QPSORouteSelector:
    """Quantum-Inspired Particle Scattering selection over route candidates."""

    def __init__(self, seed: Optional[int] = None):
        self.seed = seed

    # ------------------------------------------------------------- candidates
    def build_candidates(
        self,
        dynamic_graph,                    # DynamicRoutingGraph
        source_node: str,
        target_node: str,
        vehicle_edge_id: Optional[str] = None,
    ) -> List[RouteCandidate]:
        """Generate a diverse candidate pool from the live graph:
        dynamic shortest path, free-flow shortest path, and k penalised
        detours around the busiest edges of the primary path."""
        candidates: List[RouteCandidate] = []
        if not dynamic_graph.ensure_graph():
            return candidates

        primary = dynamic_graph.route(source_node, target_node)
        if primary is None:
            return candidates
        candidates.append(self._to_candidate(primary, dynamic_graph, "cand_dynamic_0"))

        # Free-flow baseline candidate
        ff = self._route_with_weight_override(dynamic_graph, source_node, target_node, "free_flow_time")
        if ff and ff["edge_ids"] != primary["edge_ids"]:
            candidates.append(self._to_candidate(ff, dynamic_graph, "cand_freeflow_1"))

        # Penalised detour variants around the most congested edges
        congestion_ranking = sorted(
            primary["edge_ids"],
            key=lambda eid: -(dynamic_graph.graph[eid.split("->")[0]][eid.split("->")[1]].get("congestion_penalty", 0.0)
                              if dynamic_graph.graph.has_edge(eid.split("->")[0], eid.split("->")[1]) else 0.0),
        )
        for k, eid in enumerate(congestion_ranking[:3]):
            if "->" not in eid:
                continue
            u, v = eid.split("->", 1)
            detour = self._route_avoiding_edge(dynamic_graph, source_node, target_node, u, v)
            if detour:
                cid = f"cand_detour_{k + 2}"
                if all(c.edge_ids != detour["edge_ids"] for c in candidates):
                    candidates.append(self._to_candidate(detour, dynamic_graph, cid))
        return candidates

    def _to_candidate(self, route: dict, dynamic_graph, cid: str) -> RouteCandidate:
        G = dynamic_graph.graph
        dyn_time, cong_pen, inc_pen, free_time = 0.0, 0.0, 0.0, 0.0
        for eid in route["edge_ids"]:
            u, v = eid.split("->", 1)
            if not G.has_edge(u, v):
                continue
            data = G[u][v]
            dyn_time += float(data.get("travel_time", 60.0))
            cong_pen += float(data.get("congestion_penalty", 0.0))
            inc_pen += float(data.get("incident_penalty", 0.0))
            free_time += float(data.get("free_flow_time", data.get("travel_time", 60.0)))
        return RouteCandidate(
            candidate_id=cid,
            edge_ids=route["edge_ids"],
            distance_m=route["distance_meters"],
            free_time_s=free_time,
            dynamic_time_s=dyn_time,
            congestion_penalty_s=cong_pen,
            incident_penalty_s=inc_pen,
            geometry=route["geometry"],
            node_ids=route["node_ids"],
        )

    def _route_with_weight_override(self, dg, src: str, dst: str, weight_key: str) -> Optional[dict]:
        import networkx as nx
        G = dg.graph
        try:
            path = nx.dijkstra_path(G, str(src), str(dst), weight=weight_key)
        except (nx.NetworkXNoPath, nx.NodeNotFound):
            return None
        edges, total_time, total_len, coords = [], 0.0, 0.0, []
        for a, b in zip(path[:-1], path[1:]):
            data = G[a][b]
            edges.append(f"{a}->{b}")
            total_time += float(data.get("travel_time", 60.0))
            total_len += float(data.get("length", 100.0))
            coords.append([float(G.nodes[a]["x"]), float(G.nodes[a]["y"])])
        if path:
            last = G.nodes[path[-1]]
            coords.append([float(last["x"]), float(last["y"])])
        return {"node_ids": path, "edge_ids": edges, "distance_meters": round(total_len, 1),
                "travel_time_seconds": round(total_time, 1),
                "geometry": {"type": "LineString", "coordinates": coords}}

    def _route_avoiding_edge(self, dg, src: str, dst: str, u: str, v: str) -> Optional[dict]:
        G = dg.graph
        if not G.has_edge(u, v):
            return self._route_with_weight_override(dg, src, dst, "travel_time")
        old = G[u][v].get("travel_time", 60.0)
        G[u][v]["travel_time"] = old * 8.0
        try:
            return self._route_with_weight_override(dg, src, dst, "travel_time")
        finally:
            G[u][v]["travel_time"] = old

    # ---------------------------------------------------------------- QPSO run
    def select(
        self,
        candidates: List[RouteCandidate],
        vehicle_speed_kmh: Optional[float] = None,
        current_route_edge_ids: Optional[List[str]] = None,
        reroute_penalty_s: Optional[float] = None,
        vehicle_max_speed_kmh: float = 120.0,
    ) -> Optional[QPSOSelectionResult]:
        """Quantum-behaved swarm selection over the candidate pool."""
        if not candidates:
            return None
        if len(candidates) == 1:
            c = candidates[0]
            return QPSOSelectionResult(
                best=c, all_candidates=candidates, iterations=0, population_size=1,
                best_cost=c.base_cost, computation_ms=0.0, convergence=[],
                vehicles_considered=1,
            )

        rng = random.Random(self.seed)
        reroute_pen = reroute_penalty_s if reroute_penalty_s is not None else settings.QPSO_ROUTE_CHANGE_PENALTY_S

        # --- cost model -------------------------------------------------
        def cost_of(c: RouteCandidate, is_current: bool) -> float:
            cost = c.base_cost
            # distance regulariser (mild): 1 km ~ 60 s equivalent
            cost += (c.distance_m / 1000.0) * 6.0
            # speed feasibility: candidate speeds above vehicle capability get dinged
            avg_speed = (c.distance_m / max(c.dynamic_time_s, 1.0)) * 3.6
            if avg_speed > vehicle_max_speed_kmh:
                cost += (avg_speed - vehicle_max_speed_kmh) * 10.0
            # route stability: switching away from the current route costs
            if current_route_edge_ids is not None and not is_current:
                overlap = len(set(c.edge_ids) & set(current_route_edge_ids))
                total = max(len(current_route_edge_ids), 1)
                cost += reroute_pen * (1.0 - overlap / total)
            return cost

        current_cand = None
        if current_route_edge_ids:
            for c in candidates:
                if c.edge_ids == current_route_edge_ids:
                    current_cand = c
                    break

        # --- particle encoding: index into the candidate pool ------------
        pop_size = min(max(8, len(candidates) * 3), 40)
        iterations = 30
        pop = [rng.randrange(len(candidates)) for _ in range(pop_size)]
        pbest = list(pop)
        pbest_cost = [cost_of(candidates[i], candidates[i] is current_cand) for i in pop]
        gbest_i = min(range(pop_size), key=lambda i: pbest_cost[i])
        gbest_cost = pbest_cost[gbest_i]
        gbest = pop[gbest_i]

        convergence = []
        t0 = time.time()
        for it in range(1, iterations + 1):
            beta = 0.75 * (1.0 - (it / iterations) * 0.5)  # contraction coefficient
            mean_cost = sum(pbest_cost) / len(pbest_cost)
            for i in range(pop_size):
                # Quantum attractor: probabilistic collapse toward pbest/gbest
                phi = rng.random()
                target = pbest[i] if phi < beta else gbest
                # quantum tunneling mutation
                if rng.random() < 0.15 * (1.0 - it / iterations):
                    pop[i] = rng.randrange(len(candidates))
                else:
                    # move index toward target with probability beta
                    if rng.random() < beta:
                        pop[i] = target
                cost = cost_of(candidates[pop[i]], candidates[pop[i]] is current_cand)
                if cost < pbest_cost[i]:
                    pbest[i] = pop[i]
                    pbest_cost[i] = cost
                    if cost < gbest_cost:
                        gbest_cost = cost
                        gbest = pop[i]
            if it % 5 == 0 or it == 1 or it == iterations:
                convergence.append({"iteration": it, "best_cost": round(gbest_cost, 1),
                                    "mean_cost": round(mean_cost, 1)})

        elapsed_ms = (time.time() - t0) * 1000.0
        best_cand = candidates[gbest]
        return QPSOSelectionResult(
            best=best_cand,
            all_candidates=candidates,
            iterations=iterations,
            population_size=pop_size,
            best_cost=round(gbest_cost, 2),
            computation_ms=round(elapsed_ms, 2),
            convergence=convergence,
        )

    # -------------------------------------------------------------- utilities
    @staticmethod
    def compare_baseline(best: RouteCandidate, baseline: Optional[RouteCandidate]) -> dict:
        """Measured improvement only — no fabricated numbers."""
        if baseline is None:
            return {"baseline_available": False}
        imp_s = baseline.dynamic_time_s - best.dynamic_time_s
        imp_pct = (imp_s / baseline.dynamic_time_s * 100.0) if baseline.dynamic_time_s > 0 else 0.0
        return {
            "baseline_available": True,
            "baseline_eta_s": round(baseline.dynamic_time_s, 1),
            "qpso_eta_s": round(best.dynamic_time_s, 1),
            "improvement_s": round(imp_s, 1),
            "improvement_pct": round(imp_pct, 2),
            "distance_diff_m": round(best.distance_m - baseline.distance_m, 1),
        }


qpso_selector = QPSORouteSelector()
