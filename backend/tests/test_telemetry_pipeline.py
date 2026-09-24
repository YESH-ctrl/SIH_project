"""Telemetry pipeline tests: GPS validation, staleness, traffic aggregation."""
import math
from datetime import datetime, timedelta, timezone

import pytest

from app.core.config import settings
from app.telemetry.models import PositionEvent, TelemetrySource, ValidationStatus, TrackingStatus
from app.telemetry.service import TelemetryService
from app.traffic.engine import TrafficEngine


def make_event(lat=21.2514, lng=81.6296, speed=40.0, ts=None, vid="V-TEST-01", heading=None, accuracy=5.0):
    return PositionEvent(
        vehicle_id=vid,
        timestamp=ts or datetime.now(timezone.utc),
        latitude=lat,
        longitude=lng,
        speed_kmh=speed,
        heading_deg=heading,
        accuracy_m=accuracy,
        source=TelemetrySource.TEST,
    )


# --------------------------------------------------------------------- validation
class TestGpsValidation:
    def setup_method(self):
        self.service = TelemetryService()

    def test_accepts_first_valid_fix(self):
        result = self.service.validate_event(make_event(), None)
        assert result.accepted
        assert result.status == ValidationStatus.ACCEPTED

    def test_rejects_future_timestamp(self):
        future = datetime.now(timezone.utc) + timedelta(minutes=10)
        result = self.service.validate_event(make_event(ts=future), None)
        assert not result.accepted
        assert result.status == ValidationStatus.REJECTED_BAD_TIMESTAMP

    def test_rejects_stale_fix(self):
        old = datetime.now(timezone.utc) - timedelta(hours=2)
        result = self.service.validate_event(make_event(ts=old), None)
        assert not result.accepted
        assert result.status == ValidationStatus.REJECTED_BAD_TIMESTAMP

    def test_rejects_impossible_reported_speed(self):
        # 250 km/h passes the pydantic schema cap (400) but exceeds the
        # physical vehicle limit enforced by the validation service (160).
        result = self.service.validate_event(make_event(speed=250.0), None)
        assert not result.accepted
        assert result.status == ValidationStatus.REJECTED_IMPOSSIBLE_SPEED

    def test_schema_rejects_absurd_speed(self):
        import pydantic
        with pytest.raises(pydantic.ValidationError):
            make_event(speed=900.0)

    def test_rejects_gps_jump(self):
        last_ts = datetime.now(timezone.utc) - timedelta(seconds=2)
        last_fix = {"ts": last_ts, "lat": 21.2514, "lng": 81.6296, "speed_kmh": 40.0}
        # ~5 km away in 2 s ⇒ ~9000 km/h implied — impossible
        far_event = make_event(lat=21.2965, lng=81.6740, ts=datetime.now(timezone.utc))
        result = self.service.validate_event(far_event, last_fix)
        assert not result.accepted
        assert result.status == ValidationStatus.REJECTED_GPS_JUMP

    def test_accepts_normal_movement(self):
        last_ts = datetime.now(timezone.utc) - timedelta(seconds=5)
        last_fix = {"ts": last_ts, "lat": 21.2514, "lng": 81.6296, "speed_kmh": 30.0}
        # ~55 m in 5 s ⇒ ~40 km/h — plausible
        moved = make_event(lat=21.2519, lng=81.6296, ts=datetime.now(timezone.utc))
        result = self.service.validate_event(moved, last_fix)
        assert result.accepted

    def test_rejects_out_of_order_fix(self):
        now = datetime.now(timezone.utc)
        last_fix = {"ts": now, "lat": 21.2514, "lng": 81.6296, "speed_kmh": 30.0}
        older = make_event(ts=now - timedelta(seconds=3))
        result = self.service.validate_event(older, last_fix)
        assert not result.accepted
        assert result.status == ValidationStatus.REJECTED_OUT_OF_ORDER


# ------------------------------------------------------------------ staleness
class TestStalenessLadder:
    def setup_method(self):
        self.service = TelemetryService()

    def test_live_below_10s(self):
        assert self.service.tracking_status_for_age(5) == TrackingStatus.LIVE

    def test_degraded_10_to_30s(self):
        assert self.service.tracking_status_for_age(15) == TrackingStatus.DEGRADED

    def test_stale_30_to_120s(self):
        assert self.service.tracking_status_for_age(60) == TrackingStatus.STALE

    def test_offline_beyond_120s(self):
        assert self.service.tracking_status_for_age(200) == TrackingStatus.OFFLINE


# --------------------------------------------------------------- traffic engine
class TestTrafficEngine:
    def setup_method(self):
        self.engine = TrafficEngine()
        self.engine.register_edge("u->v", "net1", free_flow_kmh=50.0, length_m=500.0, lat=21.25, lng=81.63)

    def test_unknown_without_min_samples(self):
        now = datetime.now(timezone.utc)
        for s in (40.0, 38.0):  # below TRAFFIC_MIN_SAMPLES=3
            self.engine.add_observation("u->v", s, now, source="FLEET_GPS")
        assert self.engine.recompute(now) == []
        assert self.engine.get_state("u->v") is None

    def test_green_when_flowing(self):
        now = datetime.now(timezone.utc)
        for s in (48.0, 50.0, 46.0, 49.0):
            self.engine.add_observation("u->v", s, now, source="FLEET_GPS")
        changed = self.engine.recompute(now)
        assert changed, "expected a state change for a well-observed edge"
        state = self.engine.get_state("u->v")
        assert state.level == "GREEN"
        assert 45.0 <= state.observed_kmh <= 50.0
        assert state.congestion_ratio > 0.9

    def test_single_outlier_does_not_create_congestion(self):
        now = datetime.now(timezone.utc)
        for s in (48.0, 50.0, 47.0, 49.0, 2.0):  # one GPS glitch
            self.engine.add_observation("u->v", s, now, source="FLEET_GPS")
        self.engine.recompute(now)
        state = self.engine.get_state("u->v")
        assert state.level in ("GREEN", "YELLOW"), "one outlier must not fabricate congestion"
        assert state.observed_kmh > 30.0

    def test_red_under_real_congestion(self):
        now = datetime.now(timezone.utc)
        for s in (8.0, 9.0, 8.5, 9.5, 8.2):
            self.engine.add_observation("u->v", s, now, source="FLEET_GPS")
        self.engine.recompute(now)
        state = self.engine.get_state("u->v")
        assert state.level == "RED"
        # travel time must exceed free-flow time when congested
        assert state.travel_time_s > state.free_flow_time_s

    def test_observations_expire(self):
        now = datetime.now(timezone.utc)
        for s in (45.0, 47.0, 46.0):
            self.engine.add_observation("u->v", s, now, source="FLEET_GPS")
        self.engine.recompute(now)
        assert self.engine.get_state("u->v") is not None
        # after TTL everything expires → UNKNOWN (never fabricated)
        later = now + timedelta(seconds=settings.TRAFFIC_OBSERVATION_TTL_S + 10)
        self.engine.recompute(later)
        state = self.engine.get_state("u->v")
        assert state is None or state.level == "UNKNOWN"

    def test_congestion_classification_thresholds(self):
        classify = TrafficEngine.classify
        assert classify(0.9) == "GREEN"
        assert classify(0.6) == "YELLOW"
        assert classify(0.4) == "ORANGE"
        assert classify(0.1) == "RED"


# --------------------------------------------------------------- map matching
class TestMapMatching:
    def test_matcher_matches_synthetic_grid(self):
        from app.network.map_matching import OSMMapMatcher
        from app.network.osm_loader import create_synthetic_city_graph

        matcher = OSMMapMatcher(network_id="test")
        matcher._build_index(create_synthetic_city_graph("Raipur, India"))
        assert len(matcher._edges) > 0

        # pick a point on the first edge
        edge = matcher._edges[0]
        mid_lat = (edge.lat_u + edge.lat_v) / 2.0
        mid_lng = (edge.lng_u + edge.lng_v) / 2.0
        result = matcher.match(mid_lat, mid_lng)
        assert result is not None
        assert result.edge_id == edge.edge_id
        assert 0.0 <= result.fraction <= 1.0
        assert result.confidence > 0.15

    def test_matcher_handles_offroad_drift_with_low_accuracy(self):
        from app.network.map_matching import OSMMapMatcher
        from app.network.osm_loader import create_synthetic_city_graph

        matcher = OSMMapMatcher(network_id="test")
        matcher._build_index(create_synthetic_city_graph("Raipur, India"))
        edge = matcher._edges[0]
        mid_lat = (edge.lat_u + edge.lat_v) / 2.0
        mid_lng = (edge.lng_u + edge.lng_v) / 2.0
        # 20 m off the road with 25 m GPS accuracy should still match
        result = matcher.match(mid_lat + 0.00018, mid_lng, accuracy_m=25.0)
        assert result is not None

    def test_heading_compatibility_prefers_correct_direction(self):
        from app.network.map_matching import OSMMapMatcher
        from app.network.osm_loader import create_synthetic_city_graph

        matcher = OSMMapMatcher(network_id="test")
        matcher._build_index(create_synthetic_city_graph("Raipur, India"))
        edge = matcher._edges[0]
        mid_lat = (edge.lat_u + edge.lat_v) / 2.0
        mid_lng = (edge.lng_u + edge.lng_v) / 2.0
        import math
        bearing = math.degrees(math.atan2(edge.lng_v - edge.lng_u, edge.lat_v - edge.lat_u)) % 360.0
        aligned = matcher.match(mid_lat, mid_lng, heading_deg=bearing, speed_kmh=30.0)
        assert aligned is not None
        assert aligned.edge_id == edge.edge_id
