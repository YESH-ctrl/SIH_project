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

export interface ShortestPathRouteResponse {
  network_id: string;
  source_node_id: string;
  target_node_id: string;
  node_path: string[];
  edge_count: number;
  total_distance_meters: number;
  total_distance_km: number;
  total_travel_time_seconds: number;
  total_travel_time_min: number;
  path_coordinates: [number, number][]; // [lat, lng]
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
  getNetworkNodes: (id: string, page = 1, pageSize = 10000) => fetchFromApi<NetworkNodeDTO[]>(`/networks/${id}/nodes?page=${page}&page_size=${pageSize}`),
  getNetworkEdges: (id: string, page = 1, pageSize = 10000) => fetchFromApi<NetworkEdgeDTO[]>(`/networks/${id}/edges?page=${page}&page_size=${pageSize}`),
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

