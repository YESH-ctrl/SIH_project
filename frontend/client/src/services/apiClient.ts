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

export const transportationApi = {
  getRoutes: (status?: string) => fetchFromApi<any>(`/routes${status ? `?status=${status}` : ""}`),
  getDeliveryPoints: () => fetchFromApi<any>("/delivery-points"),
  getTraffic: () => fetchFromApi<any>("/traffic"),
  getRestrictions: () => fetchFromApi<any>("/restrictions"),
};
