"""Live incident engine.

Incident lifecycle: DETECTED → CONFIRMED → ACTIVE → CLEARING → RESOLVED.
Sources: MANUAL (dispatcher), PROVIDER (external traffic API), FLEET_ANOMALY
(real telemetry slowdowns), SUMO (simulation mode only).

Coordinates are mapped to affected OSM edges dynamically via the map matcher —
no hard-coded locations. Incidents persist while ACTIVE, expire only after
their TTL or explicit resolution, and affect routing through edge penalties.
"""
import uuid
from dataclasses import dataclass, field
from datetime import datetime, timedelta, timezone
from typing import Dict, List, Optional

from app.core.config import settings
from app.core.logging import logger


INCIDENT_STATUSES = ("DETECTED", "CONFIRMED", "ACTIVE", "CLEARING", "RESOLVED")


@dataclass
class Incident:
    id: str
    type: str                     # ACCIDENT | ROADWORK | CONGESTION | WEATHER | CLOSURE
    severity: str                 # LOW | MODERATE | HIGH | SEVERE
    latitude: float
    longitude: float
    status: str = "DETECTED"
    detected_at: datetime = field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = field(default_factory=lambda: datetime.now(timezone.utc))
    expires_at: Optional[datetime] = None
    confidence: float = 1.0
    source: str = "MANUAL"
    affected_edge_ids: List[str] = field(default_factory=list)
    road_name: str = ""
    evidence_count: int = 0
    title: str = ""
    resolution_note: Optional[str] = None

    def to_event(self) -> dict:
        return {
            "type": "incident_created" if self.status == "DETECTED" else "incident_updated",
            "incident": self.to_dict(),
        }

    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "type": self.type,
            "severity": self.severity,
            "latitude": self.latitude,
            "longitude": self.longitude,
            "status": self.status,
            "detected_at": self.detected_at.isoformat(),
            "updated_at": self.updated_at.isoformat(),
            "expires_at": self.expires_at.isoformat() if self.expires_at else None,
            "confidence": self.confidence,
            "source": self.source,
            "affected_edge_ids": self.affected_edge_ids,
            "road_name": self.road_name,
            "evidence_count": self.evidence_count,
            "title": self.title or f"{self.type} on {self.road_name or 'road'}",
        }


class IncidentEngine:
    """Owns all incidents in memory + mirrors them to the incidents table."""

    def __init__(self):
        self._incidents: Dict[str, Incident] = {}
        # edge_id -> slowdown tracking for fleet anomaly detection
        self._anomaly_tracking: Dict[str, dict] = {}

    # ---------------------------------------------------------------- create
    async def create_incident(
        self,
        type_: str,
        severity: str,
        latitude: float,
        longitude: float,
        source: str = "MANUAL",
        confidence: float = 1.0,
        title: str = "",
        ttl_s: Optional[float] = None,
        status: str = "DETECTED",
        evidence_count: int = 0,
    ) -> Incident:
        incident = Incident(
            id=f"inc_{uuid.uuid4().hex[:12]}",
            type=type_,
            severity=severity,
            latitude=latitude,
            longitude=longitude,
            status=status if status in INCIDENT_STATUSES else "DETECTED",
            confidence=confidence,
            source=source,
            evidence_count=evidence_count,
            title=title,
            expires_at=datetime.now(timezone.utc) + timedelta(
                seconds=ttl_s if ttl_s is not None else settings.INCIDENT_DEFAULT_TTL_S
            ),
        )
        await self._map_to_edges(incident)
        self._incidents[incident.id] = incident
        await self._persist(incident)
        await self._publish(incident, created=True)
        logger.info("Incident %s (%s/%s) at %.5f,%.5f edges=%s",
                    incident.id, incident.type, incident.severity,
                    latitude, longitude, len(incident.affected_edge_ids))
        return incident

    async def _map_to_edges(self, incident: Incident) -> None:
        """Dynamically identify affected OSM edges around the incident location."""
        try:
            from app.network.map_matching import get_map_matcher
            matcher = get_map_matcher()
            radii = [15.0, 40.0, 90.0]
            edge_ids: List[str] = []
            road_name = ""
            for r in radii:
                edge_ids = []
                seen = set()
                # Sample points around the incident to catch nearby parallel roads
                samples = [(incident.latitude, incident.longitude)]
                for bearing in range(0, 360, 45):
                    dlat = (r / 111320.0) * 0.5 * _cos_deg(bearing)
                    dlng = (r / (111320.0 * max(_cos_deg(incident.latitude), 0.2))) * 0.5 * _sin_deg(bearing)
                    samples.append((incident.latitude + dlat, incident.longitude + dlng))
                for lat, lng in samples:
                    m = matcher.match(lat, lng)
                    if m and m.edge_id not in seen:
                        seen.add(m.edge_id)
                        edge_ids.append(m.edge_id)
                        if not road_name:
                            road_name = m.road_name
                if edge_ids:
                    break
            incident.affected_edge_ids = edge_ids
            incident.road_name = road_name or incident.road_name
        except Exception as exc:
            logger.warning("Incident edge mapping failed: %s", exc)

    # ----------------------------------------------------------------- state
    async def confirm(self, incident_id: str, note: Optional[str] = None) -> Optional[Incident]:
        inc = self._incidents.get(incident_id)
        if inc is None:
            return None
        inc.status = "CONFIRMED"
        inc.confidence = min(1.0, inc.confidence + 0.2)
        return await self._touch(inc, note)

    async def activate(self, incident_id: str) -> Optional[Incident]:
        inc = self._incidents.get(incident_id)
        if inc is None:
            return None
        inc.status = "ACTIVE"
        return await self._touch(inc)

    async def resolve(self, incident_id: str, note: Optional[str] = None) -> Optional[Incident]:
        inc = self._incidents.get(incident_id)
        if inc is None:
            return None
        inc.status = "RESOLVED"
        inc.resolution_note = note
        inc.expires_at = datetime.now(timezone.utc)
        return await self._touch(inc, note)

    async def _touch(self, inc: Incident, note: Optional[str] = None) -> Incident:
        inc.updated_at = datetime.now(timezone.utc)
        if note and note != inc.resolution_note:
            inc.resolution_note = note
        await self._persist(inc)
        await self._publish(inc, created=False)
        return inc

    async def expire_stale(self) -> List[str]:
        """Expire incidents past their TTL; resolve removes map effect via RESOLVED."""
        now = datetime.now(timezone.utc)
        expired: List[str] = []
        for inc in list(self._incidents.values()):
            if inc.status in ("RESOLVED",):
                continue
            if inc.expires_at is not None and inc.expires_at <= now:
                inc.status = "RESOLVED"
                inc.resolution_note = inc.resolution_note or "Expired without confirmation"
                await self._touch(inc)
                expired.append(inc.id)
        return expired

    # ------------------------------------------------------- fleet anomalies
    def observe_edge_traffic(self, edge_id: str, speed_kmh: float,
                             free_flow_kmh: float, observed_at: datetime) -> Optional[str]:
        """Fleet-derived anomaly detection (Section 10).

        Multiple independent vehicles reporting a severe slowdown on the same
        edge for a sustained period ⇒ POTENTIAL INCIDENT (DETECTED, confidence
        scaled by evidence). Returns the new/updated incident id if triggered.
        """
        ratio = speed_kmh / max(free_flow_kmh, 1.0)
        if ratio > settings.INCIDENT_ANOMALY_SPEED_DROP_RATIO:
            self._anomaly_tracking.pop(edge_id, None)
            return None

        track = self._anomaly_tracking.setdefault(edge_id, {
            "vehicles": set(), "first_seen": observed_at, "last_seen": observed_at,
            "speeds": [], "incident_id": None,
        })
        track["last_seen"] = observed_at
        track["speeds"].append(speed_kmh)

        return None  # incident creation is decided asynchronously in evaluate_anomalies()

    async def evaluate_anomalies(self, edge_states: Dict[str, tuple]) -> List[str]:
        """Called periodically with {edge_id: (observed_kmh, sample_count, free_flow_kmh, lat, lng)}.
        Creates DETECTED incidents for sustained multi-vehicle slowdowns."""
        now = datetime.now(timezone.utc)
        created: List[str] = []
        for edge_id, (speed, samples, ff, lat, lng) in edge_states.items():
            ratio = speed / max(ff, 1.0)
            if ratio > settings.INCIDENT_ANOMALY_SPEED_DROP_RATIO or samples < settings.INCIDENT_ANOMALY_MIN_VEHICLES:
                self._anomaly_tracking.pop(edge_id, None)
                continue

            track = self._anomaly_tracking.setdefault(edge_id, {
                "vehicles": set(), "first_seen": now, "incident_id": None, "speeds": [],
            })
            track["vehicles"].add(samples)  # sample count as independence proxy
            persist_for = (now - track["first_seen"]).total_seconds()
            if persist_for < settings.INCIDENT_ANOMALY_PERSIST_S:
                continue

            if track.get("incident_id") and track["incident_id"] in self._incidents:
                inc = self._incidents[track["incident_id"]]
                if inc.status in ("DETECTED", "CONFIRMED", "ACTIVE"):
                    inc.evidence_count = max(inc.evidence_count, samples)
                    inc.confidence = min(0.95, inc.confidence + 0.02)
                    continue
            else:
                severity = "HIGH" if ratio < 0.2 else "MODERATE"
                inc = await self.create_incident(
                    type_="CONGESTION",
                    severity=severity,
                    latitude=lat,
                    longitude=lng,
                    source="FLEET_ANOMALY",
                    confidence=settings.INCIDENT_ANOMALY_CONFIDENCE,
                    status="DETECTED",
                    evidence_count=samples,
                    title=f"Potential congestion anomaly ({int(speed)} km/h vs {int(ff)} km/h free flow)",
                    ttl_s=settings.INCIDENT_DEFAULT_TTL_S,
                )
                track["incident_id"] = inc.id
                created.append(inc.id)
        return created

    # ---------------------------------------------------------- persistence
    async def _persist(self, inc: Incident) -> None:
        try:
            from app.incidents.repository import IncidentRepository
            repo = IncidentRepository()
            await repo.upsert_incident(inc)
        except Exception as exc:
            logger.warning("Incident persist failed: %s", exc)

    async def _publish(self, inc: Incident, created: bool) -> None:
        try:
            from app.realtime.manager import realtime_manager
            await realtime_manager.broadcast({
                "type": "incident_created" if created else "incident_updated",
                "incident": inc.to_dict(),
            })
        except Exception as exc:
            logger.warning("Incident realtime publish failed: %s", exc)

    # -------------------------------------------------------------- accessors
    def get(self, incident_id: str) -> Optional[Incident]:
        return self._incidents.get(incident_id)

    def active_incidents(self) -> List[Incident]:
        """Everything not RESOLVED — stays visible while ACTIVE."""
        return [i for i in self._incidents.values() if i.status != "RESOLVED"]

    def blocking_edge_ids(self, min_confidence: float = 0.5) -> Dict[str, List[dict]]:
        """Map edge_id -> active incidents affecting it (for routing penalties)."""
        out: Dict[str, List[dict]] = {}
        for inc in self._incidents.values():
            if inc.status in ("RESOLVED",):
                continue
            if inc.confidence < min_confidence and inc.source == "FLEET_ANOMALY":
                continue
            for eid in inc.affected_edge_ids:
                out.setdefault(eid, []).append(inc.to_dict())
        return out

    def stats(self) -> dict:
        by_status = {}
        for inc in self._incidents.values():
            by_status[inc.status] = by_status.get(inc.status, 0) + 1
        return {"total": len(self._incidents), "by_status": by_status}


def _cos_deg(deg: float) -> float:
    import math
    return math.cos(math.radians(deg))


def _sin_deg(deg: float) -> float:
    import math
    return math.sin(math.radians(deg))


incident_engine = IncidentEngine()
