import { QFlowDataStore, TrafficSegment, TrafficIncident } from "@/data/qflowData";
import { supabase, isSupabaseConfigured } from "@/lib/supabaseClient";

export class TrafficService {
  static async getTrafficSegments(): Promise<TrafficSegment[]> {
    return QFlowDataStore.trafficSegments;
  }

  static async getIncidents(orgId?: string): Promise<TrafficIncident[]> {
    if (isSupabaseConfigured && orgId) {
      try {
        const { data, error } = await supabase
          .from("incidents")
          .select("*")
          .eq("organization_id", orgId);
        if (!error && data && data.length > 0) {
          return data.map((inc) => ({
            id: inc.incident_code || inc.id,
            title: inc.title,
            roadName: inc.road_name,
            type: inc.type as TrafficIncident["type"],
            severity: inc.severity as TrafficIncident["severity"],
            detectedTime: "08:42 AM",
            affectedVehiclesCount: inc.affected_vehicles_count || 6,
            affectedRoutesCount: inc.affected_routes_count || 4,
            affectedCustomersCount: 24,
            affectedZone: "Zone 3 (East)",
            status: inc.status as TrafficIncident["status"],
            lat: 21.258,
            lng: 81.642,
          }));
        }
      } catch (e) {
        console.warn("[TrafficService] Supabase fetch fallback to mock provider:", e);
      }
    }
    return QFlowDataStore.incidents;
  }
}
