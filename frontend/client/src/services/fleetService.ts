import { QFlowDataStore, Vehicle, Depot } from "@/data/qflowData";
import { supabase, isSupabaseConfigured } from "@/lib/supabaseClient";

export class FleetService {
  static async getVehicles(orgId?: string): Promise<Vehicle[]> {
    if (isSupabaseConfigured && orgId) {
      try {
        const { data, error } = await supabase
          .from("vehicles")
          .select("*")
          .eq("organization_id", orgId);
        if (!error && data && data.length > 0) {
          return data.map((v) => ({
            id: v.vehicle_code || v.id,
            name: v.name,
            type: v.type as Vehicle["type"],
            capacityKg: Number(v.capacity_kg),
            currentLoadKg: Number(v.current_load_kg),
            status: v.status as Vehicle["status"],
            currentLocation: v.current_location || "",
            nextStop: v.next_stop || "",
            eta: v.eta || "",
            routeId: v.route_id || "",
            lat: Number(v.lat) || 21.25,
            lng: Number(v.lng) || 81.63,
          }));
        }
      } catch (e) {
        console.warn("[FleetService] Supabase fetch fallback to mock provider:", e);
      }
    }
    return QFlowDataStore.vehicles;
  }

  static async getDepots(orgId?: string): Promise<Depot[]> {
    if (isSupabaseConfigured && orgId) {
      try {
        const { data, error } = await supabase
          .from("depots")
          .select("*")
          .eq("organization_id", orgId);
        if (!error && data && data.length > 0) {
          return data.map((d) => ({
            id: d.depot_code || d.id,
            name: d.name,
            lat: Number(d.lat),
            lng: Number(d.lng),
            capacityVehicles: Number(d.capacity_vehicles),
          }));
        }
      } catch (e) {
        console.warn("[FleetService] Supabase fetch fallback to mock provider:", e);
      }
    }
    return QFlowDataStore.depots;
  }
}
