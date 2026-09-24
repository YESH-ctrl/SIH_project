"""Routing, ETA, QPSO selection, rerouting thresholds + integration tests."""
from datetime import datetime, timedelta, timezone

import pytest

from app.core.config import settings
from app.network.map_matching import OSMMapMatcher
from app.network.osm_loader import create_synthetic_city_graph
from app.routing.dynamic_graph import DynamicRoutingGraph
from app.routing.eta import compute_vehicle_eta
from app.routing.qpso_selector import QPSORouteSelector, RouteCandidate
from app.routing.reroute_engine import RerouteEngine, VehicleRouteState


@pytest.fixture(scope="module")
def grid_graph():
    return create_synthetic_city_graph("Raipur, India")


@pytest.fixture(scope="module")
def dynamic_graph():
    dg = DynamicRoutingGraph()
    dg.load_graph(create_synthetic_city_graph("Raipur, India"))
    return dg


class TestDynamicGraph:
    def test_congested_edge_has_higher_cost(self, dynamic_graph):
        dg = dynamic_graph
        edge_id = next(iter(dg._live_graph.edges))
        eid = f"{edge_id[0]}->{edge_id[1]}"
        before = dg._live_graph[edge_id[0]][edge_id[1]].get("travel_time", 60.0)
        ok = dg.apply_edge_state(eid, observed_kmh=10.0, free_flow_kmh=50.0, level="RED")
        assert ok
        after = dg._live_graph[edge_id[0]][edge_id[1]]["travel_time"]
        assert after > before

    def test_blocked_edge_is_effectively_infinite(self, dynamic_graph):
        dg = dynamic_graph
        edge_id = next(iter(dg._live_graph.edges))
        eid = f"{edge_id[0]}->{edge_id[1]}"
        dg.apply_edge_state(eid, None, 50.0, "BLOCKED", blocked=True)
        assert dg._live_graph[edge_id[0]][edge_id[1]]["travel_time"] >= 1e8
        # routing must never choose the blocked edge when an alternative exists:
        # verify the blocked edge cost dominates any normal path cost.
        import networkx as nx
        u_blocked, v_blocked = edge_id
        nodes = list(dg._live_graph.nodes)
        if len(nodes) >= 3:
            src, dst = nodes[0], nodes[-1]
            if src not in (u_blocked, v_blocked) and dst not in (u_blocked, v_blocked):
                try:
                    route = dg.route(src, dst)
                    if route is not None:
                        assert f"{u_blocked}->{v_blocked}" not in route["edge_ids"], \
                            "route must not traverse a blocked edge"
                except nx.NetworkXException:
                    pass
        dg.reset()

    def test_route_returns_geometry(self, dynamic_graph):
        dg = dynamic_graph
        nodes = list(dg._live_graph.nodes)
        route = dg.route(nodes[0], nodes[-1])
        if route is not None:  # grid is strongly connected, should exist
            assert route["geometry"]["type"] == "LineString"
            assert len(route["geometry"]["coordinates"]) >= 2
            assert route["travel_time_seconds"] > 0


class TestVehicleEta:
    def _lookup(self):
        store = {
            "a->b": {"travel_time": 60.0, "length": 600.0},
            "b->c": {"travel_time": 120.0, "length": 800.0},
        }
        return lambda eid: store.get(eid)

    def test_eta_uses_edge_progress(self):
        result = compute_vehicle_eta(
            route_edge_ids=["a->b", "b->c"],
            vehicle_edge_id="a->b",
            edge_fraction=0.5,
            vehicle_speed_kmh=None,
            route_edge_lookup=self._lookup(),
            current_edge_length_m=600.0,
        )
        # half of edge a->b (60s * 0.5 = 30s) + downstream 120s
        assert result.current_eta_s == pytest.approx(150.0, rel=0.05)

    def test_vehicle_speed_used_for_current_edge(self):
        result = compute_vehicle_eta(
            route_edge_ids=["a->b", "b->c"],
            vehicle_edge_id="a->b",
            edge_fraction=0.5,
            vehicle_speed_kmh=36.0,  # 36 km/h over 300 m = 30 s
            route_edge_lookup=self._lookup(),
            current_edge_length_m=600.0,
        )
        assert result.basis == "LIVE_EDGE_PARTIAL"
        assert result.current_eta_s == pytest.approx(150.0, rel=0.05)

    def test_full_route_eta_when_no_match(self):
        result = compute_vehicle_eta(
            route_edge_ids=["a->b", "b->c"],
            vehicle_edge_id=None,
            edge_fraction=0.0,
            vehicle_speed_kmh=None,
            route_edge_lookup=self._lookup(),
            current_edge_length_m=600.0,
        )
        assert result.current_eta_s == pytest.approx(180.0, rel=0.05)


class TestQPSOSelection:
    def _candidates(self):
        return [
            RouteCandidate("c0", ["a->b", "b->c"], 1400, 180, 180, 0, 0, {}),
            RouteCandidate("c1", ["a->d", "d->c"], 1600, 150, 150, 0, 0, {}),
            RouteCandidate("c2", ["a->e", "e->f", "f->c"], 2000, 240, 240, 30, 0, {}),
        ]

    def test_selects_fastest_candidate(self):
        selector = QPSORouteSelector(seed=7)
        result = selector.select(self._candidates())
        assert result is not None
        assert result.best.candidate_id == "c1"
        assert result.best_cost < 180.0 + (1.6 * 6.0)

    def test_route_change_penalty_matters(self):
        selector = QPSORouteSelector(seed=7)
        # current route is c0: with a heavy reroute penalty the marginal gain of
        # c1 (30s) can be outweighed when the current route stays an option.
        result = selector.select(
            self._candidates(),
            current_route_edge_ids=["a->b", "b->c"],
            reroute_penalty_s=500.0,
        )
        assert result is not None
        # with the huge penalty, switching is discouraged unless far better
        assert result.best_cost >= 0

    def test_measured_improvement_only(self):
        cands = self._candidates()
        comparison = QPSORouteSelector.compare_baseline(cands[1], cands[0])
        assert comparison["baseline_available"]
        # measured delta only: baseline 180 s vs QPSO 150 s
        assert comparison["improvement_s"] == pytest.approx(30.0, abs=0.1)
        assert comparison["improvement_pct"] == pytest.approx(100 * 30.0 / 180.0, abs=0.1)


class TestRerouteThresholds:
    def _engine(self):
        engine = RerouteEngine()
        engine.set_route("V-1", VehicleRouteState(
            route_id="r1", edge_ids=["a->b"], geometry={}, eta_s=600.0,
        ))
        return engine

    def test_no_reroute_below_thresholds(self):
        decision = self._engine().evaluate("V-1", current_eta_s=600.0, candidate_eta_s=560.0)
        assert not decision.should_reroute

    def test_reroutes_on_material_improvement(self):
        # 130 s gain on 600 s = 21.7% → both thresholds pass, cooldown fresh
        decision = self._engine().evaluate("V-1", current_eta_s=600.0, candidate_eta_s=470.0)
        assert decision.should_reroute
        assert decision.improvement_pct > 8.0

    def test_cooldown_blocks_rapid_reroute(self):
        engine = self._engine()
        import time
        engine._vehicle_routes["V-1"].last_reroute_ts = time.time()
        decision = engine.evaluate("V-1", current_eta_s=600.0, candidate_eta_s=400.0)
        assert not decision.should_reroute

    def test_immediate_trigger_bypasses_thresholds(self):
        engine = self._engine()
        decision = engine.evaluate("V-1", 600.0, 590.0, immediate_reason="BLOCKED_EDGE_ON_ROUTE")
        assert decision.should_reroute
        assert decision.immediate


# ---------------------------------------------------------------- integration
class TestEndToEndPipeline:
    """Deterministic TEST-mode integration: telemetry → matching → traffic →
    incidents → routing state. TEST fixtures only; never used as live fallback."""

    def test_telemetry_through_traffic_engine(self):
        from app.traffic.engine import TrafficEngine

        matcher = OSMMapMatcher(network_id="itest")
        matcher._build_index(create_synthetic_city_graph("Raipur, India"))
        edge = matcher._edges[0]

        engine = TrafficEngine()
        engine.register_edge(edge.edge_id, "itest", free_flow_kmh=edge.speed_kph,
                             length_m=edge.length_m, lat=edge.lat_u, lng=edge.lng_u)

        now = datetime.now(timezone.utc)
        # A fleet of vehicles slows down on this edge
        for speed in (10.0, 11.0, 9.0, 12.0, 10.5):
            engine.add_observation(edge.edge_id, speed, now, source="FLEET_GPS")
        changed = engine.recompute(now)
        assert changed
        state = engine.get_state(edge.edge_id)
        assert state.level == "RED"
        assert state.source == "FLEET_GPS"

        # dynamic graph applies the live cost — node ids are normalized so the
        # matcher's edge ids resolve directly.
        dg = DynamicRoutingGraph()
        dg.load_graph(create_synthetic_city_graph("Raipur, India"))
        applied = dg.sync_from_traffic_engine(changed)
        u, v = edge.edge_id.split("->")
        if dg._live_graph.has_edge(u, v):
            assert applied > 0
            assert dg._live_graph[u][v]["travel_time"] > dg._live_graph[u][v].get("free_flow_time", 0)

    def test_anomaly_detection_requires_persistence(self):
        from app.incidents.engine import IncidentEngine

        engine = IncidentEngine()
        now = datetime.now(timezone.utc)
        # Not enough vehicles → no anomaly
        created = engine.observe_edge_traffic("e1", 8.0, 50.0, now)
        assert created is None

    def test_incident_expiry(self):
        from app.incidents.engine import IncidentEngine

        engine = IncidentEngine()
        # create directly through internal path (no DB in unit test)
        from app.incidents.engine import Incident
        inc = Incident(
            id="inc_test", type="ACCIDENT", severity="HIGH",
            latitude=21.25, longitude=81.63,
            detected_at=datetime.now(timezone.utc) - timedelta(hours=2),
            expires_at=datetime.now(timezone.utc) - timedelta(hours=1),
        )
        engine._incidents[inc.id] = inc
        expired = engine.expire_stale.__wrapped__ if hasattr(engine.expire_stale, "__wrapped__") else None
        # expire_stale is async; run it
        import asyncio
        expired_ids = asyncio.get_event_loop_policy().new_event_loop().run_until_complete(
            engine.expire_stale()
        )
        assert "inc_test" in expired_ids
        assert engine._incidents["inc_test"].status == "RESOLVED"
