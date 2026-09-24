// ─── Optimization Run History — from the backend database ────────────────────
import React, { useEffect, useState } from "react";
import { History, CheckCircle2, Loader2 } from "lucide-react";
import { getApiBaseUrl } from "@/const";

const API_BASE_URL = getApiBaseUrl();

interface RunRow {
  optimization_id: string;
  created_at: string;
  algorithm: string;
  vehicles_considered: number | null;
  iterations: number | null;
  best_cost: number | null;
  computation_time_ms: number | null;
  routes_changed: number | null;
  improvement_pct: number | null;
  data_mode: string | null;
}

export function HistoryPage() {
  const [runs, setRuns] = useState<RunRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/optimization/runs`);
        if (res.ok) setRuns((await res.json()).runs || []);
        else setError(`Optimization history HTTP ${res.status}`);
      } catch {
        setError("Backend unreachable");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  return (
    <div className="space-y-4 font-sans text-white">
      <div className="pb-2 border-b border-slate-800">
        <h1 className="text-xl font-bold font-mono text-white tracking-tight uppercase flex items-center">
          <History size={20} className="mr-2 text-sky-400" /> OPTIMIZATION RUN HISTORY
        </h1>
        <p className="text-xs text-slate-400 font-sans">
          Every QPSO run is persisted with vehicles considered, iterations, best cost and computation time.
        </p>
      </div>

      <div className="bg-[#0d1015] border border-slate-800 p-4 font-mono text-xs space-y-3">
        <div className="flex items-center justify-between border-b border-slate-800 pb-2">
          <span className="font-bold text-white uppercase tracking-wider">RECORDED RUNS</span>
          <span className="text-[10px] text-slate-400">{runs.length} RUNS</span>
        </div>

        {loading ? (
          <div className="py-6 text-slate-500 flex items-center gap-2"><Loader2 size={13} className="animate-spin" /> LOADING…</div>
        ) : error ? (
          <div className="py-6 text-red-400">{error}</div>
        ) : runs.length === 0 ? (
          <div className="py-6 text-slate-500">
            No optimization runs recorded yet. Runs appear here after live/simulation QPSO cycles or VRP demo runs.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-[11px]">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400 uppercase text-[9px]">
                  <th className="py-2.5 px-3">RUN ID</th>
                  <th className="py-2.5 px-3">TIMESTAMP</th>
                  <th className="py-2.5 px-3">VEHICLES</th>
                  <th className="py-2.5 px-3">ITERATIONS</th>
                  <th className="py-2.5 px-3">BEST COST</th>
                  <th className="py-2.5 px-2">COMPUTED</th>
                  <th className="py-2.5 px-3">ROUTES CHANGED</th>
                  <th className="py-2.5 px-3">MODE</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {runs.map((run) => (
                  <tr key={run.optimization_id} className="hover:bg-slate-900/80 transition-colors">
                    <td className="py-2.5 px-3 font-bold text-sky-400">{run.optimization_id.slice(0, 24)}</td>
                    <td className="py-2.5 px-3 text-slate-300">{new Date(run.created_at).toLocaleString()}</td>
                    <td className="py-2.5 px-3 text-slate-300">{run.vehicles_considered ?? "—"}</td>
                    <td className="py-2.5 px-3 text-slate-300">{run.iterations ?? "—"}</td>
                    <td className="py-2.5 px-3 font-bold text-emerald-400">{run.best_cost != null ? run.best_cost.toFixed(1) : "—"}</td>
                    <td className="py-2.5 px-2 text-slate-300">
                      {run.computation_time_ms != null ? `${(run.computation_time_ms / 1000).toFixed(2)} s` : "—"}
                    </td>
                    <td className="py-2.5 px-3 text-emerald-400 font-bold">{run.routes_changed ?? 0}</td>
                    <td className="py-2.5 px-3 text-slate-400 flex items-center">
                      <CheckCircle2 size={12} className="mr-1" /> {run.data_mode || "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
