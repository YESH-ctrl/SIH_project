// ─── Fleet Operations Overview — LIVE backend state ──────────────────────────
// KPIs and map derive from real telemetry via the live store. No fake fleet.
import React, { useMemo } from "react";
import { useLiveFleet } from "@/hooks/useLiveFleet";
import { LiveOperationsMap } from "./LiveOperationsMap";
import { DataModeBadge, SourceFreshnessPanel } from "./LiveModeBadge";
import { Button } from "@/components/ui/button";
import { Truck, Activity, AlertTriangle, Cpu, FlaskConical, Gauge } from "lucide-react";

interface OverviewPageProps {
  onNavigate: (tab: string) => void;
  onTriggerIncidentDemo?: () => void;
}

export function OverviewPage({ onNavigate, onTriggerIncidentDemo }: OverviewPageProps) {
  const { dataMode, vehicles, trafficEdges, incidents, routes, trackingCounts, realtimeConnected, freshness } = useLiveFleet();

  const liveVehicles = trackingCounts.LIVE ?? 0;
  const degraded = trackingCounts.DEGRADED ?? 0;
  const congestedEdges = trafficEdges.filter((e) => e.level === "RED" || e.level === "ORANGE").length;
  const activeIncidents = incidents.filter((i) => i.status !== "RESOLVED").length;
  const activeRoutes = Object.keys(routes).length;
  const reroutes = useMemo(
    () => vehicles.filter((v) => v.last_reroute_at).length,
    [vehicles]
  );

  return (
    <div className="space-y-4 font-sans text-white">
      {/* Page Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-800">
        <div>
          <h1 className="text-xl font-bold font-mono text-white tracking-tight uppercase">FLEET OPERATIONS OVERVIEW</h1>
          <p className="text-xs text-slate-400 font-sans">
            Live GPS telemetry, dynamic traffic, and QPSO route optimization from the realtime backend.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <SourceFreshnessPanel freshness={freshness} />
          <DataModeBadge mode={dataMode} realtimeConnected={realtimeConnected} />
        </div>
      </div>

      {/* KPI Cards — real counts, honest zeros */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 font-mono text-xs">
        <Kpi label="LIVE VEHICLES" value={liveVehicles} icon={<Truck size={13} className="text-emerald-400" />} sub={`${degraded} degraded`} />
        <Kpi label="EDGES OBSERVED" value={trafficEdges.filter((e) => e.level !== "UNKNOWN").length} icon={<Activity size={13} className="text-sky-400" />} sub={`${trafficEdges.length} tracked`} />
        <Kpi label="CONGESTED EDGES" value={congestedEdges} icon={<Gauge size={13} className="text-amber-400" />} sub="ORANGE + RED" />
        <Kpi label="ACTIVE INCIDENTS" value={activeIncidents} icon={<AlertTriangle size={13} className="text-red-400" />} sub="lifecycle managed" />
        <Kpi label="ACTIVE ROUTES" value={activeRoutes} icon={<Cpu size={13} className="text-lime-400" />} sub={`${reroutes} rerouted`} />
        <Kpi
          label="DATA MODE"
          value={dataMode}
          icon={<FlaskConical size={13} className="text-violet-400" />}
          sub={realtimeConnected ? "realtime connected" : "realtime offline"}
          isText
        />
      </div>

      {/* Live map */}
      <LiveOperationsMap height="480px" onSelectVehicle={() => onNavigate("live-fleet")} />

      {/* Quick actions */}
      <div className="flex flex-wrap items-center gap-2 font-mono text-xs">
        <Button
          onClick={() => onNavigate("route-optimization")}
          className="bg-emerald-500 hover:bg-emerald-600 text-black font-bold uppercase rounded-none px-4 py-2"
        >
          <Cpu size={14} className="mr-1.5" /> QPSO OPTIMIZATION
        </Button>
        <Button
          onClick={() => onNavigate("simulation")}
          variant="outline"
          className="border-slate-700 bg-slate-800 hover:bg-slate-700 text-white rounded-none px-3.5 py-2"
        >
          <FlaskConical size={13} className="mr-1.5 text-amber-400" /> SIMULATION MODE
        </Button>
        {onTriggerIncidentDemo && (
          <Button
            onClick={() => onNavigate("traffic-events")}
            className="bg-red-500/20 hover:bg-red-500/30 text-red-400 border border-red-500/40 rounded-none px-3.5 py-2"
          >
            <AlertTriangle size={13} className="mr-1.5" /> INCIDENT MANAGEMENT
          </Button>
        )}
      </div>
    </div>
  );
}

function Kpi({ label, value, icon, sub, isText = false }: {
  label: string; value: number | string; icon: React.ReactNode; sub: string; isText?: boolean;
}) {
  return (
    <div className="p-3 bg-[#0d1015] border border-slate-800 space-y-1">
      <div className="flex items-center justify-between text-slate-400 text-[10px] uppercase font-semibold">
        <span>{label}</span>
        {icon}
      </div>
      <div className={`text-xl font-bold ${isText ? "text-amber-400 text-base" : "text-white"}`}>{value}</div>
      <div className="text-[10px] text-slate-500">{sub}</div>
    </div>
  );
}
