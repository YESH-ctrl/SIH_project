import math
import random
import time
from typing import List, Dict, Any, Tuple, Optional
import networkx as nx

from app.optimization.models import (
    DepotDTO,
    DeliveryPointDTO,
    VehicleSpecDTO,
    VehicleRouteResultDTO,
    StopDetailDTO,
    SolutionMetricsDTO,
    ConvergencePointDTO,
    OptimizationRunResponseDTO,
)
from app.network.routing import compute_shortest_path, find_nearest_node, haversine_distance_meters

class VRPEvaluator:
    """
    Evaluates VRP solutions (route distance, time, geometries, violations).
    Uses Dijkstra on OSM road graph G for accurate road distances and GeoJSON paths.
    """
    def __init__(self, G: nx.DiGraph, network_id: str, depot: DepotDTO, delivery_points: List[DeliveryPointDTO]):
        self.G = G
        self.network_id = network_id
        self.depot = depot
        self.delivery_points = delivery_points
        self.all_nodes: List[Dict[str, Any]] = []  # Index 0 = depot, 1..N = delivery points
        
        # Snap depot to graph
        if not depot.node_id:
            near = find_nearest_node(G, depot.latitude, depot.longitude)
            depot.node_id = near["node_id"]

        self.all_nodes.append({
            "id": depot.id,
            "name": depot.name,
            "lat": depot.latitude,
            "lng": depot.longitude,
            "node_id": depot.node_id,
            "demand": 0,
            "is_depot": True
        })

        # Snap delivery points to graph
        for dp in self.delivery_points:
            if not dp.node_id:
                near = find_nearest_node(G, dp.latitude, dp.longitude)
                dp.node_id = near["node_id"]
            
            self.all_nodes.append({
                "id": dp.id,
                "name": dp.name,
                "lat": dp.latitude,
                "lng": dp.longitude,
                "node_id": dp.node_id,
                "demand": dp.demand,
                "is_depot": False
            })

        self.num_locs = len(self.all_nodes)
        self.dist_matrix: List[List[float]] = [[0.0]*self.num_locs for _ in range(self.num_locs)]
        self.time_matrix: List[List[float]] = [[0.0]*self.num_locs for _ in range(self.num_locs)]
        self.route_cache: Dict[Tuple[int, int], Dict[str, Any]] = {}

        self._build_matrices()

    def _build_matrices(self):
        """Precompute shortest path matrix between all locations."""
        for i in range(self.num_locs):
            for j in range(self.num_locs):
                if i == j:
                    self.dist_matrix[i][j] = 0.0
                    self.time_matrix[i][j] = 0.0
                    continue
                
                src_node = self.all_nodes[i]["node_id"]
                tgt_node = self.all_nodes[j]["node_id"]

                try:
                    res = compute_shortest_path(self.G, self.network_id, src_node, tgt_node)
                    dist = float(res.get("distance_meters", 0.0))
                    t_sec = float(res.get("travel_time_seconds", 0.0))
                    self.dist_matrix[i][j] = dist
                    self.time_matrix[i][j] = t_sec
                    self.route_cache[(i, j)] = res
                except Exception:
                    # Fallback haversine estimation
                    dist = haversine_distance_meters(
                        self.all_nodes[i]["lat"], self.all_nodes[i]["lng"],
                        self.all_nodes[j]["lat"], self.all_nodes[j]["lng"]
                    )
                    t_sec = (dist / 11.11)  # ~40 km/h average
                    self.dist_matrix[i][j] = dist
                    self.time_matrix[i][j] = t_sec
                    self.route_cache[(i, j)] = {
                        "geometry": {
                            "type": "LineString",
                            "coordinates": [
                                [self.all_nodes[i]["lng"], self.all_nodes[i]["lat"]],
                                [self.all_nodes[j]["lng"], self.all_nodes[j]["lat"]]
                            ]
                        },
                        "distance_meters": dist,
                        "travel_time_seconds": t_sec
                    }

    def decode_permutation(self, permutation: List[int], vehicles: List[VehicleSpecDTO]) -> List[List[int]]:
        """
        Split delivery point permutation (1..N) into vehicle routes according to vehicle capacity.
        """
        routes: List[List[int]] = [[] for _ in vehicles]
        v_idx = 0
        curr_load = 0

        for cust_idx in permutation:
            demand = self.all_nodes[cust_idx]["demand"]
            capacity = vehicles[v_idx].capacity

            if curr_load + demand <= capacity:
                routes[v_idx].append(cust_idx)
                curr_load += demand
            else:
                # Move to next vehicle
                v_idx += 1
                if v_idx < len(vehicles):
                    routes[v_idx].append(cust_idx)
                    curr_load = demand
                else:
                    # Capacity overflow fallback: append to last vehicle
                    routes[-1].append(cust_idx)
                    curr_load += demand

        return routes

    def evaluate_solution(self, routes: List[List[int]], vehicles: List[VehicleSpecDTO]) -> Tuple[float, SolutionMetricsDTO, List[VehicleRouteResultDTO]]:
        """
        Evaluate full multi-vehicle solution performance metrics and geometries.
        """
        total_dist_m = 0.0
        total_time_s = 0.0
        total_demand_deliv = 0
        capacity_violations = 0
        vehicles_used = 0

        vehicle_results: List[VehicleRouteResultDTO] = []

        for v_idx, cust_list in enumerate(routes):
            v_spec = vehicles[v_idx]
            if not cust_list:
                continue

            vehicles_used += 1
            v_dist_m = 0.0
            v_time_s = 0.0
            v_demand = 0
            v_coords: List[List[float]] = []
            stop_details: List[StopDetailDTO] = []

            # 0 -> Depot start
            prev_idx = 0
            curr_time_s = 0.0

            for s_idx, cust_idx in enumerate(cust_list):
                demand = self.all_nodes[cust_idx]["demand"]
                v_demand += demand

                leg_dist = self.dist_matrix[prev_idx][cust_idx]
                leg_time = self.time_matrix[prev_idx][cust_idx]

                v_dist_m += leg_dist
                v_time_s += leg_time
                curr_time_s += leg_time

                # Append leg geometry coordinates
                leg_res = self.route_cache.get((prev_idx, cust_idx))
                if leg_res and "geometry" in leg_res and "coordinates" in leg_res["geometry"]:
                    leg_coords = leg_res["geometry"]["coordinates"]
                    if not v_coords:
                        v_coords.extend(leg_coords)
                    else:
                        # Append omitting redundant junction point
                        v_coords.extend(leg_coords[1:] if len(leg_coords) > 1 else leg_coords)
                else:
                    v_coords.append([self.all_nodes[cust_idx]["lng"], self.all_nodes[cust_idx]["lat"]])

                stop_details.append(StopDetailDTO(
                    stop_index=s_idx + 1,
                    delivery_point_id=self.all_nodes[cust_idx]["id"],
                    name=self.all_nodes[cust_idx]["name"],
                    node_id=self.all_nodes[cust_idx]["node_id"],
                    latitude=self.all_nodes[cust_idx]["lat"],
                    longitude=self.all_nodes[cust_idx]["lng"],
                    demand=demand,
                    arrival_time_seconds=round(curr_time_s, 1),
                    distance_from_prev_meters=round(leg_dist, 1)
                ))

                prev_idx = cust_idx

            # Return to Depot (cust_idx -> 0)
            return_dist = self.dist_matrix[prev_idx][0]
            return_time = self.time_matrix[prev_idx][0]

            v_dist_m += return_dist
            v_time_s += return_time

            leg_res = self.route_cache.get((prev_idx, 0))
            if leg_res and "geometry" in leg_res and "coordinates" in leg_res["geometry"]:
                leg_coords = leg_res["geometry"]["coordinates"]
                v_coords.extend(leg_coords[1:] if len(leg_coords) > 1 else leg_coords)

            if v_demand > v_spec.capacity:
                capacity_violations += (v_demand - v_spec.capacity)

            total_dist_m += v_dist_m
            total_time_s += v_time_s
            total_demand_deliv += v_demand

            utilization = round((v_demand / v_spec.capacity) * 100.0, 1)

            vehicle_results.append(VehicleRouteResultDTO(
                vehicle_id=v_spec.id,
                vehicle_name=v_spec.name,
                color=v_spec.color,
                stops=stop_details,
                geometry={"type": "LineString", "coordinates": v_coords},
                distance_meters=round(v_dist_m, 1),
                travel_time_seconds=round(v_time_s, 1),
                total_demand=v_demand,
                capacity=v_spec.capacity,
                utilization_pct=utilization
            ))

        total_dist_km = round(total_dist_m / 1000.0, 2)
        total_time_min = round(total_time_s / 60.0, 2)

        # Multi-objective fitness function formula (Section 8 requirement)
        fitness = (total_time_s * 1.0) + (total_dist_m * 0.5) + (capacity_violations * 500.0)

        metrics = SolutionMetricsDTO(
            total_distance_km=total_dist_km,
            total_travel_time_min=total_time_min,
            vehicles_used=vehicles_used,
            total_demand_delivered=total_demand_deliv,
            capacity_violations=capacity_violations,
            fitness_score=round(fitness, 2)
        )

        return fitness, metrics, vehicle_results


class BaselineVRPSolver:
    """
    Deterministic Greedy / Nearest-Neighbor VRP Baseline.
    """
    def __init__(self, evaluator: VRPEvaluator, vehicles: List[VehicleSpecDTO]):
        self.evaluator = evaluator
        self.vehicles = vehicles

    def solve(self) -> Tuple[SolutionMetricsDTO, List[VehicleRouteResultDTO]]:
        unvisited = list(range(1, self.evaluator.num_locs))
        routes: List[List[int]] = [[] for _ in self.vehicles]

        v_idx = 0
        curr_load = 0
        curr_loc = 0

        while unvisited and v_idx < len(self.vehicles):
            cap = self.vehicles[v_idx].capacity
            best_next = None
            best_dist = float("inf")

            for candidate in unvisited:
                demand = self.evaluator.all_nodes[candidate]["demand"]
                if curr_load + demand <= cap:
                    d = self.evaluator.dist_matrix[curr_loc][candidate]
                    if d < best_dist:
                        best_dist = d
                        best_next = candidate

            if best_next is not None:
                routes[v_idx].append(best_next)
                curr_load += self.evaluator.all_nodes[best_next]["demand"]
                unvisited.remove(best_next)
                curr_loc = best_next
            else:
                # Next vehicle
                v_idx += 1
                curr_load = 0
                curr_loc = 0

        # Assign any remaining overflow unvisited
        if unvisited:
            for rem in unvisited:
                routes[-1].append(rem)

        _, metrics, vehicle_results = self.evaluator.evaluate_solution(routes, self.vehicles)
        return metrics, vehicle_results


class DiscreteQPSOSolver:
    """
    Quantum-behaved Particle Swarm Optimization (QPSO) for Discrete VRP.
    Classical metaheuristic running on CPU with quantum probability wave-function contraction.
    """
    def __init__(
        self,
        evaluator: VRPEvaluator,
        vehicles: List[VehicleSpecDTO],
        pop_size: int = 30,
        iterations: int = 100,
        beta_quantum: float = 0.75,
        seed: Optional[int] = 42
    ):
        self.evaluator = evaluator
        self.vehicles = vehicles
        self.pop_size = pop_size
        self.iterations = iterations
        self.beta = beta_quantum

        if seed is not None:
            random.seed(seed)

    def _swap_towards(self, current: List[int], target: List[int], prob: float) -> List[int]:
        """Apply permutation swap operations towards target sequence with probability `prob`."""
        res = list(current)
        for i in range(len(res)):
            if random.random() < prob:
                target_val = target[i]
                curr_idx = res.index(target_val)
                res[i], res[curr_idx] = res[curr_idx], res[i]
        return res

    def solve(self) -> Tuple[SolutionMetricsDTO, List[VehicleRouteResultDTO], List[ConvergencePointDTO]]:
        cust_indices = list(range(1, self.evaluator.num_locs))
        
        # Initialize population
        pop: List[List[int]] = []
        pbest: List[List[int]] = []
        pbest_fit: List[float] = []

        gbest: Optional[List[int]] = None
        gbest_fit = float("inf")

        for _ in range(self.pop_size):
            perm = list(cust_indices)
            random.shuffle(perm)
            pop.append(perm)
            pbest.append(perm)

            routes = self.evaluator.decode_permutation(perm, self.vehicles)
            fit, _, _ = self.evaluator.evaluate_solution(routes, self.vehicles)
            pbest_fit.append(fit)

            if fit < gbest_fit:
                gbest_fit = fit
                gbest = list(perm)

        convergence: List[ConvergencePointDTO] = []

        # Iteration Loop
        for it in range(1, self.iterations + 1):
            # Dynamic contraction-expansion coefficient
            alpha = self.beta * (1.0 - (it / self.iterations) * 0.5)

            # Evaluate mean fitness
            mean_fit = sum(pbest_fit) / len(pbest_fit)

            for i in range(self.pop_size):
                # Quantum attractor point selection p_i
                phi = random.random()
                
                # Blend local best and global best
                step1 = self._swap_towards(pop[i], pbest[i], phi * alpha)
                step2 = self._swap_towards(step1, gbest, (1.0 - phi) * alpha)

                # Quantum delta mutation (wave function collapse)
                if random.random() < 0.25:
                    idx1, idx2 = random.sample(range(len(step2)), 2)
                    step2[idx1], step2[idx2] = step2[idx2], step2[idx1]

                pop[i] = step2

                # Evaluate fitness
                routes = self.evaluator.decode_permutation(pop[i], self.vehicles)
                fit, _, _ = self.evaluator.evaluate_solution(routes, self.vehicles)

                if fit < pbest_fit[i]:
                    pbest[i] = list(pop[i])
                    pbest_fit[i] = fit

                    if fit < gbest_fit:
                        gbest_fit = fit
                        gbest = list(pop[i])

            if it % 5 == 0 or it == 1 or it == self.iterations:
                convergence.append(ConvergencePointDTO(
                    iteration=it,
                    best_fitness=round(gbest_fit, 2),
                    mean_fitness=round(mean_fit, 2)
                ))

        # Final evaluation of global best
        best_routes = self.evaluator.decode_permutation(gbest, self.vehicles)
        _, final_metrics, vehicle_results = self.evaluator.evaluate_solution(best_routes, self.vehicles)

        return final_metrics, vehicle_results, convergence
