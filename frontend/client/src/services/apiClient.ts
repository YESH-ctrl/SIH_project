// Q-FLOW Frontend API Client connecting to FastAPI backend

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000/api/v1";

export async function fetchFromApi<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string>),
  };

  // Get active Supabase auth token or fallback header
  const demoEmail = localStorage.getItem("qswarm_demo_user_email") || "ops@qswarm.io";
  headers["X-Demo-User"] = demoEmail;

  try {
    const res = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...options,
      headers,
    });

    if (!res.ok) {
      throw new Error(`API error ${res.status}: ${res.statusText}`);
    }

    return await res.json();
  } catch (error) {
    console.warn(`[Q-FLOW API] Fetch failed for ${endpoint}, using local provider fallback.`, error);
    throw error;
  }
}

export const dashboardApi = {
  getAdminDashboard: () => fetchFromApi<any>("/dashboards/admin"),
  getOperationsDashboard: () => fetchFromApi<any>("/dashboards/operations"),
  getDispatcherDashboard: () => fetchFromApi<any>("/dashboards/dispatcher"),
  getAnalystDashboard: () => fetchFromApi<any>("/dashboards/analyst"),
};

export interface RoadNetworkDTO {
  id: string;
  organization_id: string;
  name: string;
  source: string;
  version: string;
  created_at?: string;
}

export interface NetworkNodeDTO {
  id: string;
  network_id: string;
  external_id?: string;
  lat: number;
  lng: number;
}

export interface NetworkEdgeDTO {
  id: string;
  network_id: string;
  external_id?: string;
  from_node_id: string;
  to_node_id: string;
  road_name: string;
  length_meters: number;
  speed_limit_kph: number;
  road_type: string;
  capacity_vehicles: number;
  geometry?: any;
}

export interface NetworkStatsResponse {
  network_id: string;
  name: string;
  node_count: number;
  edge_count: number;
  strongly_connected_components: number;
  weakly_connected_components: number;
  min_length_meters: number;
  max_length_meters: number;
  avg_length_meters: number;
  min_speed_kph: number;
  max_speed_kph: number;
  avg_speed_kph: number;
  min_travel_time_seconds: number;
  max_travel_time_seconds: number;
  avg_travel_time_seconds: number;
  is_valid: boolean;
}

export interface NearestNodeResponse {
  node_id: string;
  latitude: number;
  longitude: number;
  distance_meters: number;
}

export interface RouteResult {
  geometry: {
    type: string;
    coordinates: [number, number][]; // [longitude, latitude]
  };
  distance_meters: number;
  travel_time_seconds: number;
  node_count?: number;
  edge_count?: number;
  algorithm?: string;
}

export interface ShortestPathRouteResponse {
  network_id: string;
  source_node_id: string;
  target_node_id: string;
  node_ids: string[];
  edge_ids: string[];
  distance_meters: number;
  distance_km: number;
  travel_time_seconds: number;
  travel_time_min: number;
  node_count: number;
  edge_count: number;
  geometry: {
    type: string;
    coordinates: [number, number][]; // [longitude, latitude]
  };
  algorithm: string;
  // Backwards compatibility fields
  node_path?: string[];
  total_distance_meters?: number;
  total_distance_km?: number;
  total_travel_time_seconds?: number;
  total_travel_time_min?: number;
  path_coordinates?: [number, number][]; // [lat, lng]
}

export const transportationApi = {
  getRoutes: (status?: string) => fetchFromApi<any>(`/routes${status ? `?status=${status}` : ""}`),
  getDeliveryPoints: () => fetchFromApi<any>("/delivery-points"),
  getTraffic: () => fetchFromApi<any>("/traffic"),
  getRestrictions: () => fetchFromApi<any>("/restrictions"),
};

export const networkApi = {
  getNetworks: () => fetchFromApi<RoadNetworkDTO[]>("/networks"),
  getNetwork: (id: string) => fetchFromApi<RoadNetworkDTO>(`/networks/${id}`),
  getNetworkStats: (id: string) => fetchFromApi<NetworkStatsResponse>(`/networks/${id}/stats`),
  getNetworkNodes: (id: string, page = 1, pageSize = 50000) => fetchFromApi<NetworkNodeDTO[]>(`/networks/${id}/nodes?page=${page}&page_size=${pageSize}`),
  getNetworkEdges: (id: string, page = 1, pageSize = 50000) => fetchFromApi<NetworkEdgeDTO[]>(`/networks/${id}/edges?page=${page}&page_size=${pageSize}`),
  getNearestNode: (id: string, latitude: number, longitude: number) =>
    fetchFromApi<NearestNodeResponse>(`/networks/${id}/nearest-node`, {
      method: "POST",
      body: JSON.stringify({ latitude, longitude }),
    }),
  calculateRoute: (
    id: string,
    req: {
      source_node_id?: string;
      target_node_id?: string;
      source_lat?: number;
      source_lng?: number;
      target_lat?: number;
      target_lng?: number;
    }
  ) =>
    fetchFromApi<ShortestPathRouteResponse>(`/networks/${id}/route`, {
      method: "POST",
      body: JSON.stringify(req),
    }),
};
export interface StopDetail {
  stop_index: number;
  delivery_point_id: string;
  name: string;
  node_id: string;
  latitude: number;
  longitude: number;
  demand: number;
  arrival_time_seconds: number;
  distance_from_prev_meters: number;
}

export interface VehicleRouteResult {
  vehicle_id: string;
  vehicle_name: string;
  color: string;
  stops: StopDetail[];
  geometry: {
    type: "LineString";
    coordinates: [number, number][]; // [lng, lat]
  };
  distance_meters: number;
  travel_time_seconds: number;
  total_demand: number;
  capacity: number;
  utilization_pct: number;
}

export interface SolutionMetrics {
  total_distance_km: number;
  total_travel_time_min: number;
  vehicles_used: number;
  total_demand_delivered: number;
  capacity_violations: number;
  fitness_score: number;
}

export interface ConvergencePoint {
  iteration: number;
  best_fitness: number;
  mean_fitness: number;
}

export interface DepotData {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  node_id?: string;
}

export interface DeliveryPointData {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  demand: number;
  node_id?: string;
  service_time_seconds?: number;
}

export interface OptimizationRunResponse {
  run_id: string;
  network_id: string;
  status: string;
  algorithm: string;
  population_size: number;
  iterations: number;
  runtime_ms: number;
  baseline_metrics: SolutionMetrics;
  qpso_metrics: SolutionMetrics;
  distance_improvement_pct: number;
  time_improvement_pct: number;
  fitness_improvement_pct: number;
  qpso_routes: VehicleRouteResult[];
  baseline_routes: VehicleRouteResult[];
  convergence_history: ConvergencePoint[];
  depot: DepotData;
  delivery_points: DeliveryPointData[];
}

export interface IncidentSimulationResponse {
  incident_id: string;
  network_id: string;
  edge_id: string;
  road_name: string;
  latitude: number;
  longitude: number;
  severity: string;
  affected_vehicle_id: string;
  affected_route_id: string;
  delay_increase_pct: number;
  status: string;
}

export interface RerouteResponse {
  reroute_id: string;
  status: string;
  affected_vehicle_id: string;
  original_route: VehicleRouteResult;
  rerouted_route: VehicleRouteResult;
  original_travel_time_min: number;
  new_travel_time_min: number;
  time_delay_saved_min: number;
  reroute_runtime_ms: number;
  avoided_edge_id: string;
}

export interface VehicleSpecDTO {
  id: string;
  name: string;
  capacity: number;
  start_depot_id: string;
  end_depot_id?: string;
  color?: string;
}

export const optimizationApi = {
  getDemoDataset: () =>
    fetchFromApi<{
      depot: DepotData;
      delivery_points: DeliveryPointData[];
      vehicles: VehicleSpecDTO[];
    }>("/optimization/demo-dataset"),
  runDemo: (populationSize = 30, iterations = 100, seed = 42) =>
    fetchFromApi<OptimizationRunResponse>(
      `/optimization/demo?population_size=${populationSize}&iterations=${iterations}&seed=${seed}`,
      { method: "POST" }
    ),
  simulateIncident: (networkId = "9cb256c8-6c5a-4f05-8259-e8b887334fa2", vehicleId = "veh_01") =>
    fetchFromApi<IncidentSimulationResponse>("/optimization/simulate-incident", {
      method: "POST",
      body: JSON.stringify({ network_id: networkId, vehicle_id: vehicleId }),
    }),
  rerouteVehicle: (networkId: string, incidentId: string, affectedEdgeId: string, affectedVehicleId = "veh_01") =>
    fetchFromApi<RerouteResponse>("/optimization/reroute", {
      method: "POST",
      body: JSON.stringify({
        network_id: networkId,
        incident_id: incidentId,
        affected_edge_id: affectedEdgeId,
      }),
    }),
};

export interface DemoScenarioResponse {

  scenario_id: string;
  organization: {
    id: string;
    name: string;
    logo_url?: string;
  };
  network: {
    id: string;
    name: string;
    source: string;
    version: string;
  };
  depot: DepotData & { depot_code?: string; capacity_vehicles?: number; lat?: number; lng?: number };
  vehicles: (VehicleSpecDTO & { vehicle_code?: string; capacity_kg?: number; status?: string })[];
  customers: {
    id: string;
    customer_code: string;
    name: string;
    demand_kg: number;
    lat: number;
    lng: number;
  }[];
  delivery_points: (DeliveryPointData & { point_code?: string; demand_kg?: number; lat?: number; lng?: number; priority?: string; status?: string })[];
  routes: {
    id: string;
    route_code: string;
    vehicle_id: string;
    depot_id: string;
    status: string;
    distance_km: number;
    estimated_duration_min: number;
  }[];
  route_stops: {
    id: string;
    route_id: string;
    delivery_point_id: string;
    sequence_number: number;
    eta?: string;
  }[];
  traffic_states: {
    id: string;
    road_segment_code: string;
    road_name: string;
    current_speed_kmh: number;
    free_flow_speed_kmh: number;
    congestion_percent: number;
    congestion_level: string;
  }[];
  restrictions: {
    id: string;
    restriction_code: string;
    name: string;
    restriction_type: string;
    affected_road: string;
    status: string;
  }[];
  incidents: {
    id: string;
    incident_code: string;
    title: string;
    road_name: string;
    type: string;
    severity: string;
    status: string;
  }[];
  optimization_runs: any[];
  optimization_results: any[];
  profiles?: {
    id: string;
    auth_user_id?: string;
    full_name?: string;
    email?: string;
    role?: string;
    organization_id?: string;
    created_at?: string;
  }[];
}

export const demoApi = {
  getScenario: () => fetchFromApi<DemoScenarioResponse>("/demo/scenario"),
};



