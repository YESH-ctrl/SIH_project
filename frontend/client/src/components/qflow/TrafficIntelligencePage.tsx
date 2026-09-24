// ─── Traffic Intelligence — computed from LIVE traffic engine state ──────────
// All KPIs derive from real edge observations (fleet GPS / provider fusion).
// Edges without sufficient observations are UNKNOWN and are excluded from
// averages — never fabricated.
import React, { useMemo } from "react";
import { useLiveFleet } from "@/hooks/useLiveFleet";
import { LiveOperationsMap } from "./LiveOperationsMap";
import { Activity, Gauge, AlertTriangle, TrendingUp } from "lucide-react";
import { DataModeBadge, SourceFreshnessPanel } from "./LiveModeBadge";

export function TrafficIntelligencePage() {
  const { dataMode, trafficEdges, realtimeConnected, freshness } = useLiveFleet();

  const kpis = useMemo(() => {
    const withData = trafficEdges.filter((e) => e.observed_speed_kmh != null && e.free_flow_speed_kmh);
    const unknownCount = trafficEdges.length - withData.length;
    if (withData.length === 0) {
      return { avgSpeed: null, avgFreeFlow: null, congested: 0, blocked: 0, unknown: unknownCount, worstRoad: null };
    }
    const avgSpeed = withData.reduce((s, e) => s + (e.observed_speed_kmh || 0), 0) / withData.length;
    const avgFreeFlow = withData.reduce((s, e) => s + (e.free_flow_speed_kmh || 0), 0) / withData.length;
    const congested = withData.filter((e) => e.level === "RED" || e.level === "ORANGE").length;
    const blocked = withData.filter((e) => e.level === "BLOCKED").length;
    const worst = withData.reduce((w, e) =>
      ((e.congestion_ratio ?? 1) < (w.congestion_ratio ?? 1) ? e : w), withData[0]);
    return { avgSpeed, avgFreeFlow, congested, blocked, unknown: unknownCount, worstRoad: worst?.road_name || worst?.edge_id || null };
  }, [trafficEdges]);

  return (
    <div className="space-y-4 font-sans text-white">
      {/* Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-800">
        <div>
          <h1 className="text-xl font-bold font-mono text-white tracking-tight uppercase flex items-center">
            <Activity size={20} className="mr-2 text-amber-400" /> TRAFFIC INTELLIGENCE ENGINE
          </h1>
          <p className="text-xs text-slate-400 font-sans">
            Live road speeds derived from real fleet telemetry. Edges without observations are shown as UNKNOWN.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <SourceFreshnessPanel freshness={freshness} />
          <DataModeBadge mode={dataMode} realtimeConnected={realtimeConnected} />
        </div>
      </div>

      {/* Top KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 font-mono text-xs">
        <div className="p-3 bg-[#0d1015] border border-slate-800 space-y-1">
          <div className="flex items-center justify-between text-slate-400 text-[10px] uppercase font-semibold">
            <span>OBSERVED NETWORK SPEED</span>
            <Gauge size={14} className="text-emerald-400" />
          </div>
          <div className="text-2xl font-bold text-white">
            {kpis.avgSpeed != null ? kpis.avgSpeed.toFixed(0) : "—"} <span className="text-xs font-normal text-slate-400">km/h</span>
          </div>
          <div className="text-[10px] text-emerald-400">
            {kpis.avgFreeFlow != null ? `Free flow ${kpis.avgFreeFlow.toFixed(0)} km/h` : "No observations yet"}
          </div>
        </div>

        <div className="p-3 bg-[#0d1015] border border-slate-800 space-y-1">
          <div className="flex items-center justify-between text-slate-400 text-[10px] uppercase font-semibold">
            <span>EDGES OBSERVED</span>
            <TrendingUp size={14} className="text-sky-400" />
          </div>
          <div className="text-2xl font-bold text-white">{trafficEdges.filter((e) => e.level !== "UNKNOWN").length}</div>
          <div className="text-[10px] text-slate-400">{kpis.unknown} awaiting sufficient samples</div>
        </div>

        <div className="p-3 bg-[#0d1015] border border-slate-800 space-y-1">
          <div className="flex items-center justify-between text-slate-400 text-[10px] uppercase font-semibold">
            <span>CONGESTED EDGES</span>
            <AlertTriangle size={14} className="text-amber-400" />
          </div>
          <div className="text-2xl font-bold text-amber-400">{kpis.congested}</div>
          <div className="text-[10px] text-amber-400">{kpis.blocked} blocked</div>
        </div>

        <div className="p-3 bg-[#0d1015] border border-slate-800 space-y-1">
          <div className="flex items-center justify-between text-slate-400 text-[10px] uppercase font-semibold">
            <span>WORST ROAD</span>
            <TrendingUp size={14} className="text-indigo-400" />
          </div>
          <div className="text-sm font-bold text-indigo-400 truncate" title={kpis.worstRoad || ""}>
            {kpis.worstRoad || "—"}
          </div>
          <div className="text-[10px] text-slate-400">by congestion ratio</div>
        </div>
      </div>

      {/* Main Grid: Map & Details */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        <div className="lg:col-span-8 h-[480px]">
          <LiveOperationsMap height="480px" />
        </div>

        <div className="lg:col-span-4 bg-[#0d1015] border border-slate-800 p-4 font-mono text-xs space-y-4">
          <div className="border-b border-slate-800 pb-2 flex justify-between items-center">
            <span className="font-bold text-white uppercase tracking-wider">EDGE STATE SAMPLE</span>
            <span className="text-[10px] text-emerald-400">LIVE ENGINE</span>
          </div>

          {trafficEdges.length === 0 ? (
            <div className="text-slate-500 text-center py-8">
              TRAFFIC DATA UNAVAILABLE
              <div className="text-[10px] mt-1">Edge states appear once vehicles are map-matched and sample thresholds are met.</div>
            </div>
          ) : (
            <div className="space-y-1.5 max-h-[400px] overflow-y-auto">
              {trafficEdges
                .filter((e) => e.level !== "UNKNOWN")
                .slice(0, 25)
                .map((e) => (
                  <div key={e.edge_id} className="flex items-center justify-between p-2 bg-slate-900 border border-slate-800">
                    <div className="min-w-0">
                      <div className="font-bold text-white truncate">{e.road_name || e.edge_id.slice(0, 18)}</div>
                      <div className="text-[9px] text-slate-500">
                        {e.sample_count ?? 0} samples • conf {Math.round((e.speed_confidence ?? 0) * 100)}% • {e.source}
                      </div>
                    </div>
                    <div className="text-right shrink-0 ml-2">
                      <div className={`font-bold ${
                        e.level === "GREEN" ? "text-emerald-400" :
                        e.level === "YELLOW" ? "text-amber-300" :
                        e.level === "ORANGE" ? "text-orange-400" :
                        e.level === "RED" || e.level === "BLOCKED" ? "text-red-400" : "text-slate-500"}`}>
                        {e.observed_speed_kmh != null ? `${e.observed_speed_kmh.toFixed(0)} km/h` : "UNKNOWN"}
                      </div>
                      <div className="text-[9px] text-slate-500">FF {e.free_flow_speed_kmh?.toFixed(0)} km/h</div>
                    </div>
                  </div>
                ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
