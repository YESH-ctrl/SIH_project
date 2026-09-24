"""Vehicle-specific ETA.

ETA = remaining time on current matched edge (accounting for progress fraction
and vehicle speed) + sum of live travel times along the remaining route edges.
Never distance / fixed assumed speed. Returns current_route_eta,
alternative_route_eta and eta_difference.
"""
from dataclasses import dataclass
from typing import List, Optional, Tuple

from app.core.config import settings


@dataclass
class EtaResult:
    current_eta_s: float
    alternative_eta_s: Optional[float]
    eta_difference_s: Optional[float]
    remaining_distance_m: float
    basis: str  # LIVE_EDGES | LIVE_EDGE_PARTIAL | FREE_FLOW_FALLBACK


def _haversine_m(lat1: float, lng1: float, lat2: float, lng2: float) -> float:
    import math
    R = 6371000.0
    phi1, phi2 = math.radians(lat1), math.radians(lat2)
    dphi = math.radians(lat2 - lat1)
    dlam = math.radians(lng2 - lng1)
    a = math.sin(dphi / 2) ** 2 + math.cos(phi1) * math.cos(phi2) * math.sin(dlam / 2) ** 2
    return R * 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))


def compute_vehicle_eta(
    route_edge_ids: List[str],
    vehicle_edge_id: Optional[str],
    edge_fraction: float,
    vehicle_speed_kmh: Optional[float],
    route_edge_lookup,       # callable edge_id -> {"travel_time": s, "length": m}
    current_edge_length_m: float,
    alternative_edge_ids: Optional[List[str]] = None,
    alternative_lookup=None,
) -> EtaResult:
    """Compute live ETA along the route using per-edge live travel times."""
    # ---- remaining distance on the current matched edge ------------------
    remaining_on_edge_m = 0.0
    time_on_edge_s = 0.0
    basis = "LIVE_EDGES"

    if vehicle_edge_id and vehicle_edge_id in route_edge_ids:
        frac = max(0.0, min(1.0, edge_fraction if edge_fraction is not None else 0.0))
        remaining_on_edge_m = current_edge_length_m * (1.0 - frac)

        # Prefer the vehicle's own speed for the current edge segment when sane.
        edge_state = route_edge_lookup(vehicle_edge_id) if route_edge_lookup else None
        edge_speed_kmh = None
        if edge_state is not None:
            length_m = float(edge_state.get("length", current_edge_length_m))
            tt = float(edge_state.get("travel_time", 0.0))
            edge_speed_kmh = (length_m / tt) * 3.6 if tt > 0 else None

        # Use vehicle speed for the remainder of this edge if plausible
        # (0.3x..1.5x of edge observed speed band), else the edge live time.
        use_vehicle_speed = (
            vehicle_speed_kmh is not None and vehicle_speed_kmh > 2.0 and edge_speed_kmh
            and 0.3 <= (vehicle_speed_kmh / max(edge_speed_kmh, 1.0)) <= 1.5
        )
        if use_vehicle_speed:
            time_on_edge_s = remaining_on_edge_m / (vehicle_speed_kmh / 3.6)
            basis = "LIVE_EDGE_PARTIAL"
        elif edge_state is not None and tt > 0:
            time_on_edge_s = tt * (1.0 - frac)
        else:
            time_on_edge_s = remaining_on_edge_m / (35.0 / 3.6)
            basis = "FREE_FLOW_FALLBACK"

    # ---- remaining edges after the matched one ---------------------------
    remaining_edges: List[str] = []
    if vehicle_edge_id and vehicle_edge_id in route_edge_ids:
        idx = route_edge_ids.index(vehicle_edge_id)
        remaining_edges = route_edge_ids[idx + 1:]
    else:
        remaining_edges = route_edge_ids
        if vehicle_edge_id is None:
            basis = "LIVE_EDGES"

    downstream_time_s = 0.0
    downstream_dist_m = 0.0
    for eid in remaining_edges:
        st = route_edge_lookup(eid) if route_edge_lookup else None
        if st is None:
            downstream_time_s += 60.0
            downstream_dist_m += 300.0
            continue
        downstream_time_s += float(st.get("travel_time", 60.0))
        downstream_dist_m += float(st.get("length", 300.0))

    current_eta = time_on_edge_s + downstream_time_s

    alt_eta = None
    if alternative_edge_ids and alternative_lookup is not None:
        alt_time = 0.0
        # Vehicle still needs to finish its current edge before alternatives diverge
        alt_time += time_on_edge_s
        for eid in alternative_edge_ids:
            st = alternative_lookup(eid)
            if st is None:
                alt_time += 60.0
            else:
                alt_time += float(st.get("travel_time", 60.0))
        alt_eta = alt_time

    diff = None
    if alt_eta is not None:
        diff = round(alt_eta - current_eta, 1)

    return EtaResult(
        current_eta_s=round(current_eta, 1),
        alternative_eta_s=round(alt_eta, 1) if alt_eta is not None else None,
        eta_difference_s=diff,
        remaining_distance_m=round(remaining_on_edge_m + downstream_dist_m, 1),
        basis=basis,
    )
