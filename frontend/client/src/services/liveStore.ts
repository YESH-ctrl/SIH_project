// ─── Q-FLOW Live Realtime Store ──────────────────────────────────────────────
// Server-state store: REST initial snapshot + WebSocket live updates.
// Replaces direct QFlowDataStore fake-data dependencies for LIVE operations.
// Every record carries provenance (mode/source) so the UI can never present
// SIMULATION data as LIVE data.
// ─────────────────────────────────────────────────────────────────────────────

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "/api/v1";
const WS_BASE_URL = import.meta.env.VITE_WS_BASE_URL || "";

export type DataMode = "LIVE" | "SIMULATION" | "TEST" | "UNKNOWN";
export type TrackingStatus = "LIVE" | "DEGRADED" | "STALE" | "OFFLINE";

export interface LiveVehicle {
  vehicle_id: string;
  name?: string;
  type?: string;
  tracking_status: TrackingStatus;
  lat: number | null;
  lng: number | null;
  speed_kmh: number | null;
  heading_deg: number | null;
  last_gps_timestamp: string | null;
  gps_accuracy_m?: number | null;
  edge_id?: string | null;
  road_name?: string | null;
  route_id?: string | null;
  eta_s?: number | null;
  last_reroute_at?: string | null;
  last_reroute_reason?: string | null;
  telemetry_source?: string | null;
  telemetry_source_mode?: string | null;
  // client-side
  _last_seen_ms?: number;
  _prev_lat?: number | null;
  _prev_lng?: number | null;
}

export interface TrafficEdgeState {
  edge_id: string;
  road_name?: string | null;
  level: "GREEN" | "YELLOW" | "ORANGE" | "RED" | "BLOCKED" | "UNKNOWN";
  observed_speed_kmh?: number | null;
  free_flow_speed_kmh?: number | null;
  congestion_ratio?: number | null;
  sample_count?: number;
  speed_confidence?: number;
  travel_time_seconds?: number | null;
  source?: string;
  updated_at?: string;
  geometry?: { coordinates: [number, number][] } | null;
}

export interface LiveIncident {
  id: string;
  type: string;
  severity: string;
  latitude: number;
  longitude: number;
  status: string;
  detected_at: string;
  updated_at?: string;
  expires_at?: string | null;
  confidence: number;
  source: string;
  affected_edge_ids: string[];
  road_name?: string;
  evidence_count?: number;
  title?: string;
}

export interface VehicleRoute {
  vehicle_id: string;
  route_id: string;
  reason?: string;
  eta_seconds?: number | null;
  polyline: [number, number][]; // [lng, lat]
  edge_ids?: string[];
  optimization_run_id?: string | null;
  timestamp?: string;
}

export interface SourceFreshness {
  fleetGpsAgeS: number | null;
  externalTrafficAgeS: number | null;
  incidentDataAgeS: number | null;
  realtimeConnected: boolean;
}

export interface LiveSnapshot {
  data_mode: DataMode;
  vehicles: LiveVehicle[];
  trafficEdges: TrafficEdgeState[];
  incidents: LiveIncident[];
  routes: Record<string, VehicleRoute>;
  tracking_counts: Record<string, number>;
  fetchedAt: number;
}

type Listener = (event: LiveEvent) => void;

export interface LiveEvent {
  type: string;
  [key: string]: unknown;
}

class LiveStoreImpl {
  snapshot: LiveSnapshot = {
    data_mode: "UNKNOWN",
    vehicles: [],
    trafficEdges: [],
    incidents: [],
    routes: {},
    tracking_counts: {},
    fetchedAt: 0,
  };

  realtimeConnected = false;
  lastFleetGpsAt: number | null = null;
  lastExternalTrafficAt: number | null = null;
  lastIncidentAt: number | null = null;

  private listeners = new Set<Listener>();
  private statusListeners = new Set<(s: { realtimeConnected: boolean; dataMode: DataMode }) => void>();
  private ws: WebSocket | null = null;
  private wsRetry = 0;
  private wsRetryTimer: number | null = null;
  private intentionallyClosed = false;

  // ------------------------------------------------------------- subscribe
  subscribe(fn: Listener): () => void {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  subscribeStatus(fn: (s: { realtimeConnected: boolean; dataMode: DataMode }) => void): () => void {
    this.statusListeners.add(fn);
    return () => this.statusListeners.delete(fn);
  }

  private emit(event: LiveEvent) {
    this.listeners.forEach((fn) => {
      try {
        fn(event);
      } catch (e) {
        console.error("[LiveStore] listener error", e);
      }
    });
  }

  private emitStatus() {
    const s = { realtimeConnected: this.realtimeConnected, dataMode: this.snapshot.data_mode };
    this.statusListeners.forEach((fn) => fn(s));
  }

  // ------------------------------------------------------------ REST snapshot
  async refresh(): Promise<LiveSnapshot> {
    const [vehiclesRes, trafficRes, incidentsRes] = await Promise.all([
      fetch(`${API_BASE_URL}/vehicles`),
      fetch(`${API_BASE_URL}/traffic/edges?limit=2000`),
      fetch(`${API_BASE_URL}/incidents`),
    ]);
    if (!vehiclesRes.ok) throw new Error(`Vehicles API ${vehiclesRes.status}`);
    const vehiclesJson = await vehiclesRes.json();
    const trafficJson = trafficRes.ok ? await trafficRes.json() : { edges: [] };
    const incidentsJson = incidentsRes.ok ? await incidentsRes.json() : { incidents: [] };

    this.snapshot = {
      data_mode: (vehiclesJson.data_mode as DataMode) || "UNKNOWN",
      vehicles: vehiclesJson.vehicles || [],
      trafficEdges: trafficJson.edges || [],
      incidents: incidentsJson.incidents || [],
      routes: { ...this.snapshot.routes },
      tracking_counts: vehiclesJson.tracking_counts || {},
      fetchedAt: Date.now(),
    };
    for (const v of this.snapshot.vehicles) v._last_seen_ms = Date.now();
    this.emit({ type: "snapshot_refreshed" });
    this.emitStatus();
    return this.snapshot;
  }

  async fetchVehicleDetail(vehicleId: string): Promise<Record<string, unknown>> {
    const res = await fetch(`${API_BASE_URL}/vehicles/${encodeURIComponent(vehicleId)}`);
    if (!res.ok) throw new Error(`Vehicle detail ${res.status}`);
    return res.json();
  }

  async fetchSystemStatus(): Promise<Record<string, any>> {
    const res = await fetch(`${API_BASE_URL}/system/status`);
    if (!res.ok) throw new Error(`System status ${res.status}`);
    return res.json();
  }

  async setDestination(vehicleId: string, lat: number, lng: number, name = ""): Promise<Record<string, unknown>> {
    const res = await fetch(`${API_BASE_URL}/vehicles/${encodeURIComponent(vehicleId)}/destination`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ latitude: lat, longitude: lng, name }),
    });
    if (!res.ok) throw new Error(`Destination ${res.status}`);
    return res.json();
  }

  async createIncident(payload: {
    type: string; severity: string; latitude: number; longitude: number; title?: string;
  }): Promise<Record<string, unknown>> {
    const res = await fetch(`${API_BASE_URL}/incidents`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error(`Incident create ${res.status}`);
    return res.json();
  }

  // ---------------------------------------------------------------- WebSocket
  connectWebSocket(): void {
    if (this.ws && (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING)) return;
    this.intentionallyClosed = false;
    const wsUrl = WS_BASE_URL || `${location.protocol === "https:" ? "wss" : "ws"}://${location.host}`;
    try {
      this.ws = new WebSocket(`${wsUrl}/ws/live`);
    } catch (e) {
      this.scheduleReconnect();
      return;
    }
    this.ws.onopen = () => {
      this.realtimeConnected = true;
      this.wsRetry = 0;
      this.emitStatus();
    };
    this.ws.onmessage = (msg) => {
      try {
        this.handleEvent(JSON.parse(msg.data));
      } catch (e) {
        /* ignore malformed frames */
      }
    };
    this.ws.onclose = () => {
      this.realtimeConnected = false;
      this.emitStatus();
      if (!this.intentionallyClosed) this.scheduleReconnect();
    };
    this.ws.onerror = () => {
      /* onclose follows */
    };

    // keepalive ping every 25s
    if (this.pingTimer) clearInterval(this.pingTimer);
    this.pingTimer = window.setInterval(() => {
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        this.ws.send(JSON.stringify({ type: "ping" }));
      }
    }, 25000);
  }

  private pingTimer: number | null = null;

  private scheduleReconnect() {
    if (this.wsRetryTimer) return;
    const delay = Math.min(15000, 1000 * Math.pow(2, this.wsRetry));
    this.wsRetry = Math.min(this.wsRetry + 1, 5);
    this.wsRetryTimer = window.setTimeout(() => {
      this.wsRetryTimer = null;
      this.connectWebSocket();
    }, delay);
  }

  disconnectWebSocket() {
    this.intentionallyClosed = true;
    if (this.pingTimer) clearInterval(this.pingTimer);
    this.ws?.close();
    this.ws = null;
  }

  // ------------------------------------------------------------ event intake
  private handleEvent(ev: LiveEvent) {
    switch (ev.type) {
      case "vehicle_position":
        this.applyVehiclePosition(ev);
        break;
      case "vehicle_status":
        this.applyVehicleStatus(ev);
        break;
      case "traffic_update":
        this.applyTrafficUpdate(ev);
        break;
      case "incident_created":
      case "incident_updated":
        this.applyIncident(ev);
        break;
      case "route_update":
        this.applyRouteUpdate(ev);
        break;
      case "optimization_complete":
        this.emit(ev);
        break;
      default:
        break; // connection_established / pong
    }
  }

  private applyVehiclePosition(ev: LiveEvent) {
    const vehicleId = String(ev.vehicle_id);
    const vehicles = [...this.snapshot.vehicles];
    const now = Date.now();
    let v = vehicles.find((x) => x.vehicle_id === vehicleId);
    const lat = ev.lat as number;
    const lng = ev.lng as number;
    if (!v) {
      v = {
        vehicle_id: vehicleId,
        tracking_status: (ev.status as TrackingStatus) || "LIVE",
        lat,
        lng,
        speed_kmh: (ev.speed_kmh as number) ?? null,
        heading_deg: (ev.heading_deg as number) ?? null,
        last_gps_timestamp: (ev.timestamp as string) ?? null,
        edge_id: (ev.edge_id as string) ?? null,
        telemetry_source: (ev.source as string) ?? null,
      };
      vehicles.push(v);
    } else {
      v._prev_lat = v.lat;
      v._prev_lng = v.lng;
      v.lat = lat;
      v.lng = lng;
      v.speed_kmh = (ev.speed_kmh as number) ?? v.speed_kmh;
      v.heading_deg = (ev.heading_deg as number) ?? v.heading_deg;
      v.last_gps_timestamp = (ev.timestamp as string) ?? v.last_gps_timestamp;
      v.edge_id = (ev.edge_id as string) ?? v.edge_id;
      if (ev.road_name) v.road_name = ev.road_name as string;
      v.tracking_status = (ev.status as TrackingStatus) || v.tracking_status;
    }
    v._last_seen_ms = now;
    this.lastFleetGpsAt = now;
    this.snapshot = { ...this.snapshot, vehicles };
    this.emit({ ...ev, vehicle: v } as LiveEvent);
  }

  private applyVehicleStatus(ev: LiveEvent) {
    const vehicleId = String(ev.vehicle_id);
    const vehicles = this.snapshot.vehicles.map((v) =>
      v.vehicle_id === vehicleId ? { ...v, tracking_status: (ev.status as TrackingStatus) || v.tracking_status } : v
    );
    this.snapshot = { ...this.snapshot, vehicles };
    this.emit(ev);
  }

  private applyTrafficUpdate(ev: LiveEvent) {
    const detail = (ev.detail as any[]) || [];
    if (!detail.length) return;
    const byId = new Map(this.snapshot.trafficEdges.map((e) => [e.edge_id, e]));
    for (const d of detail) {
      const prev = byId.get(d.edge_id);
      byId.set(d.edge_id, {
        edge_id: d.edge_id,
        level: d.level,
        observed_speed_kmh: d.observed_kmh ?? null,
        free_flow_speed_kmh: d.free_flow_kmh ?? null,
        congestion_ratio: d.congestion_ratio ?? null,
        sample_count: d.sample_count ?? 0,
        speed_confidence: d.confidence ?? null,
        travel_time_seconds: d.travel_time_s ?? null,
        source: d.source,
        updated_at: new Date().toISOString(),
        geometry: prev?.geometry ?? null,
      });
    }
    this.snapshot = { ...this.snapshot, trafficEdges: Array.from(byId.values()) };
    this.emit(ev);
  }

  private applyIncident(ev: LiveEvent) {
    const inc = ev.incident as LiveIncident;
    if (!inc) return;
    this.lastIncidentAt = Date.now();
    let incidents = this.snapshot.incidents;
    if (inc.status === "RESOLVED") {
      incidents = incidents.filter((i) => i.id !== inc.id);
    } else {
      const exists = incidents.some((i) => i.id === inc.id);
      incidents = exists
        ? incidents.map((i) => (i.id === inc.id ? inc : i))
        : [...incidents, inc];
    }
    this.snapshot = { ...this.snapshot, incidents };
    this.emit(ev);
  }

  private applyRouteUpdate(ev: LiveEvent) {
    const vehicleId = String(ev.vehicle_id);
    const route: VehicleRoute = {
      vehicle_id: vehicleId,
      route_id: String(ev.route_id || ""),
      reason: ev.reason as string,
      eta_seconds: (ev.eta_seconds as number) ?? null,
      polyline: (ev.polyline as [number, number][]) || [],
      edge_ids: (ev.edge_ids as string[]) || [],
      optimization_run_id: (ev.optimization_run_id as string) ?? null,
      timestamp: ev.timestamp as string,
    };
    if (!route.polyline.length) return;
    const routes = { ...this.snapshot.routes, [vehicleId]: route };
    this.snapshot = { ...this.snapshot, routes };
    // A reroute implies new ETA for the vehicle
    const vehicles = this.snapshot.vehicles.map((v) =>
      v.vehicle_id === vehicleId
        ? { ...v, route_id: route.route_id, eta_s: route.eta_seconds ?? v.eta_s, last_reroute_reason: route.reason ?? v.last_reroute_reason }
        : v
    );
    this.snapshot = { ...this.snapshot, vehicles };
    this.emit(ev);
  }

  // ------------------------------------------------------------- freshness
  freshness(): SourceFreshness {
    const age = (t: number | null) => (t === null ? null : Math.round((Date.now() - t) / 1000));
    return {
      fleetGpsAgeS: age(this.lastFleetGpsAt),
      externalTrafficAgeS: age(this.lastExternalTrafficAt),
      incidentDataAgeS: age(this.lastIncidentAt),
      realtimeConnected: this.realtimeConnected,
    };
  }
}

export const liveStore = new LiveStoreImpl();
