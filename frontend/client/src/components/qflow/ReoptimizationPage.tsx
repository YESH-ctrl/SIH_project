// ─── Dynamic Rerouting — REAL reroute log from the backend ───────────────────
// Every reroute decision recorded by the rerouting engine is listed with
// measured ETAs and improvements. No fabricated before/after stories.
import React, { useEffect, useState } from "react";
import { useLiveFleet } from "@/hooks/useLiveFleet";
import { LiveOperationsMap } from "./LiveOperationsMap";
import { DataModeBadge } from "./LiveModeBadge";
import { RefreshCw, ArrowRight, Route, Timer, TrendingDown } from "lucide-react";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "/api/v1";

interface RerouteLogRow {
  id: string;
  vehicle_code: string;
  old_route_id: string | null;
  new_route_id: string;
  old_eta_s: number | null;
  new_eta_s: number | null;
  eta_improvement_s: number | null;
  eta_improvement_pct: number | null;
  reason: string;
  created_at: string;
}

interface OptRunRow {
  optimization_id: string;
  created_at: string;
  vehicles_considered: number | null;
  routes_changed: number | null;
  best_cost: number | null;
  computation_time_ms: number | null;
  data_mode: string | null;
}

export function ReoptimizationPage() {
  const { dataMode, realtimeConnected, routes } = useLiveFleet();
  const [reroutes, setReroutes] = useState<RerouteLogRow[]>([]);
  const [runs, setRuns] = useState<OptRunRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    try {
      const [rrRes, runRes] = await Promise.all([
        fetch(`${API_BASE_URL}/optimization/reroutes`),
        fetch(`${API_BASE_URL}/optimization/runs`),
      ]);
      if (rrRes.ok) setReroutes((await rrRes.json()).reroutes || []);
      if (runRes.ok) setRuns((await runRes.json()).runs || []);
      setError(null);
    } catch (e: any) {
      setError("Backend unreachable — reroute history unavailable");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    const t = window.setInterval(load, 10000);
    return () => clearInterval(t);
  }, []);

  return (
    <div className="space-y-4 font-sans text-white">
      {/* Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-800">
        <div>
          <h1 className="text-xl font-bold font-mono text-white tracking-tight uppercase flex items-center">
            <RefreshCw size={20} className="mr-2 text-emerald-400" /> DYNAMIC REROUTING LOG
          </h1>
          <p className="text-xs text-slate-400 font-sans">
            QPSO evaluates live alternatives; reroutes fire only when measured improvement exceeds configurable
            thresholds. Every decision is logged with its actual ETAs.
          </p>
        </div>
        <DataModeBadge mode={dataMode} realtimeConnected={realtimeConnected} />
      </div>

      {error && (
        <div className="p-3 bg-red-500/10 border border-red-500/40 font-mono text-xs text-red-300">{error}</div>
      )}

      {/* Active routes under management */}
      <div className="bg-[#0d1015] border border-slate-800 p-4 font-mono text-xs space-y-2">
        <div className="font-bold text-white uppercase tracking-wider text-[10px]">ROUTES UNDER ACTIVE MANAGEMENT</div>
        {Object.keys(routes).length === 0 ? (
          <div className="text-slate-500 py-3">
            No vehicle routes assigned yet. Set a destination on a tracked vehicle to begin route management.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
            {Object.values(routes).map((r) => (
              <div key={r.vehicle_id} className="p-2.5 bg-slate-900 border border-slate-800">
                <div className="flex justify-between items-center">
                  <span className="font-bold text-sky-400">{r.vehicle_id}</span>
                  <span className="text-[10px] text-slate-400">
                    {r.eta_seconds != null ? `${Math.round(r.eta_seconds / 60)} min ETA` : ""}
                  </span>
                </div>
                <div className="text-[9px] text-slate-500 mt-0.5 flex items-center gap-1">
                  <Route size={9} /> {r.route_id.slice(0, 24)} {r.reason ? `• ${r.reason}` : ""}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Reroute log */}
      <div className="bg-[#0d1015] border border-slate-800 p-4 font-mono text-xs space-y-3">
        <div className="flex items-center justify-between border-b border-slate-800 pb-2">
          <span className="font-bold text-white uppercase tracking-wider">REROUTE DECISION LOG (reroute_log)</span>
          <span className="text-[10px] text-slate-400">MEASURED VALUES ONLY</span>
        </div>
        {loading ? (
          <div className="text-slate-500 py-3">LOADING…</div>
        ) : reroutes.length === 0 ? (
          <div className="text-slate-500 py-3">
            No reroutes recorded yet. The rerouting engine logs a decision whenever thresholds
            (ETA gain ≥ 120 s, improvement ≥ 8%, cooldown 30 s) are met or an immediate trigger fires.
          </div>
        ) : (
          <div className="divide-y divide-slate-800">
            {reroutes.map((r) => (
              <div key={r.id} className="py-2.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex items-center gap-3 min-w-0">
                  <span className="font-bold text-sky-400 shrink-0">{r.vehicle_code}</span>
                  <span className="text-slate-500 flex items-center gap-1 text-[10px]">
                    {r.old_eta_s != null ? `${Math.round(r.old_eta_s / 60)}m` : "?"} <ArrowRight size={10} />
                  </span>
                  <span className="text-slate-300 font-bold">{r.new_eta_s != null ? `${Math.round(r.new_eta_s / 60)}m` : "?"}</span>
                  <span className="text-[10px] px-1.5 py-0.5 bg-slate-800 text-slate-300">{r.reason}</span>
                </div>
                <div className="flex items-center gap-3 text-[10px] shrink-0">
                  {r.eta_improvement_s != null && r.eta_improvement_s > 0 ? (
                    <span className="text-emerald-400 font-bold flex items-center gap-1">
                      <TrendingDown size={10} /> −{Math.round(r.eta_improvement_s)}s ({r.eta_improvement_pct?.toFixed(1)}%)
                    </span>
                  ) : (
                    <span className="text-slate-500">immediate trigger</span>
                  )}
                  <span className="text-slate-500">{new Date(r.created_at).toLocaleTimeString()}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Optimization runs */}
      <div className="bg-[#0d1015] border border-slate-800 p-4 font-mono text-xs space-y-3">
        <div className="flex items-center justify-between border-b border-slate-800 pb-2">
          <span className="font-bold text-white uppercase tracking-wider">QPSO OPTIMIZATION RUNS</span>
          <span className="text-[10px] text-slate-400">EXPERIMENTAL METRICS</span>
        </div>
        {runs.length === 0 ? (
          <div className="text-slate-500 py-3">No optimization runs recorded yet.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-[10px]">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400 uppercase text-[9px]">
                  <th className="py-2 px-2">RUN</th>
                  <th className="py-2 px-2">TIME</th>
                  <th className="py-2 px-2">VEHICLES</th>
                  <th className="py-2 px-2">ROUTES CHANGED</th>
                  <th className="py-2 px-2">BEST COST</th>
                  <th className="py-2 px-2">MODE</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {runs.slice(0, 12).map((r) => (
                  <tr key={r.optimization_id}>
                    <td className="py-2 px-2 font-bold text-slate-200">{r.optimization_id.slice(0, 20)}</td>
                    <td className="py-2 px-2 text-slate-400">{new Date(r.created_at).toLocaleTimeString()}</td>
                    <td className="py-2 px-2 text-white">{r.vehicles_considered ?? "—"}</td>
                    <td className="py-2 px-2 text-emerald-400 font-bold">{r.routes_changed ?? 0}</td>
                    <td className="py-2 px-2 text-slate-300">{r.best_cost != null ? r.best_cost.toFixed(1) : "—"}</td>
                    <td className="py-2 px-2 text-slate-400">{r.data_mode || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Live map with managed routes */}
      <LiveOperationsMap height="420px" />
    </div>
  );
}
