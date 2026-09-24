import { QFlowDataStore, OptimizationRun, BenchmarkResult } from "@/data/qflowData";
import { supabase, isSupabaseConfigured } from "@/lib/supabaseClient";

export class OptimizationService {
  static async getOptimizationHistory(orgId?: string): Promise<OptimizationRun[]> {
    if (isSupabaseConfigured && orgId) {
      try {
        const { data, error } = await supabase
          .from("optimization_runs")
          .select("*")
          .eq("organization_id", orgId)
          .order("created_at", { ascending: false });
        if (!error && data && data.length > 0) {
          return data.map((run) => ({
            id: run.run_code || run.id,
            date: new Date(run.created_at).toLocaleString(),
            vehiclesCount: run.vehicles_count,
            customersCount: run.customers_count,
            algorithm: run.algorithm,
            fitness: Number(run.fitness_score),
            runtimeSec: Number(run.runtime_sec),
            status: run.status as OptimizationRun["status"],
            travelTimeSavedPercent: Number(run.travel_time_saved_percent),
          }));
        }
      } catch (e) {
        console.warn("[OptimizationService] Supabase fetch fallback to mock provider:", e);
      }
    }
    return QFlowDataStore.history;
  }

  static async getBenchmarks(): Promise<BenchmarkResult[]> {
    return QFlowDataStore.benchmarks;
  }
}
