// ─── Simulation Control (SUMO) — authoritative backend status ────────────────
// Fixes the old hard-coded "SUMO ACTIVE" states: running/vehicleCount always
// come from GET /api/v1/simulation/status. SUMO telemetry is labelled
// SIMULATION everywhere and never presented as live data.
import React, { useCallback, useEffect, useRef, useState } from "react";
import { Play, Pause, AlertTriangle, Activity, FlaskConical, Radio } from "lucide-react";
import { LiveOperationsMap } from "./LiveOperationsMap";
import { DataModeBadge, SourceFreshnessPanel } from "./LiveModeBadge";
import { useLiveFleet } from "@/hooks/useLiveFleet";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "/api/v1";

interface SimStatus {
  running: boolean;
  connected: boolean;
  vehicle_count: number;
  sim_time_s: number;
  state: string;
  error: string | null;
  data_mode: string;
}

export function SimulationPage({ onTriggerIncidentDemo }: { onTriggerIncidentDemo?: () => void }) {
  const { dataMode, vehicles, incidents, realtimeConnected, freshness } = useLiveFleet();
  const [status, setStatus] = useState<SimStatus | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const pollRef = useRef<number | null>(null);

  const loadStatus = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/simulation/status`);
      if (res.ok) {
        setStatus(await res.json());
        setError(null);
      } else {
        setError(`Simulation status HTTP ${res.status}`);
      }
    } catch (e) {
      setError("Backend unreachable — SUMO status unknown");
    }
  }, []);

  useEffect(() => {
    loadStatus();
    pollRef.current = window.setInterval(loadStatus, 3000);
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [loadStatus]);

  const control = async (action: "start" | "stop") => {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE_URL}/simulation/${action}`, { method: "POST" });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(body.detail || `Simulation ${action} failed (HTTP ${res.status})`);
      }
      await loadStatus();
    } catch (e: any) {
      setError(e?.message || `Simulation ${action} failed`);
    } finally {
      setBusy(false);
    }
  };

  const simVehicles = vehicles.filter((v) => v.telemetry_source === "sumo").length;
  const running = status?.running ?? false;

  return (
    <div className="space-y-4 font-sans text-white">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-800">
        <div>
          <h1 className="text-xl font-bold font-mono text-white tracking-tight uppercase flex items-center">
            <FlaskConical size={20} className="mr-2 text-amber-400" /> TRAFFIC SIMULATION CONTROL (SUMO)
          </h1>
          <p className="text-xs text-slate-400 font-sans">
            SIMULATION telemetry flows through the same pipeline (validation → map matching → traffic → QPSO) and is
            always labelled SIMULATION — never presented as live data.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <SourceFreshnessPanel freshness={freshness} />
          <DataModeBadge mode={dataMode} realtimeConnected={realtimeConnected} />
        </div>
      </div>

      {/* Controls */}
      <div className="flex flex-wrap items-center gap-2 font-mono text-xs">
        <button
          onClick={() => control(running ? "stop" : "start")}
          disabled={busy}
          className={`px-4 py-2 font-bold uppercase rounded-none border transition-all disabled:opacity-50 ${
            running
              ? "bg-amber-500 hover:bg-amber-600 text-black border-amber-500"
              : "bg-emerald-500 hover:bg-emerald-600 text-black border-emerald-500"
          }`}
        >
          {running ? <Pause size={13} className="inline mr-1" /> : <Play size={13} className="inline mr-1" />}
          {running ? "STOP SIMULATION" : "START SIMULATION"}
        </button>

        {onTriggerIncidentDemo && (
          <button
            onClick={onTriggerIncidentDemo}
            className="px-3.5 py-2 bg-red-500/20 hover:bg-red-500/30 text-red-400 border border-red-500/40 font-bold uppercase"
          >
            <AlertTriangle size={13} className="inline mr-1" /> INJECT INCIDENT
          </button>
        )}

        {error && <span className="text-red-400 text-[11px]">{error}</span>}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 h-[520px]">
        <div className="lg:col-span-8 h-full">
          <LiveOperationsMap height="520px" />
        </div>

        <div className="lg:col-span-4 bg-[#0d1015] border border-slate-800 p-4 font-mono text-xs space-y-4">
          <div className="border-b border-slate-800 pb-2 flex justify-between items-center">
            <span className="font-bold text-white uppercase tracking-wider">SIMULATION ENGINE STATE</span>
            <span className={`text-[10px] font-bold flex items-center gap-1 ${running ? "text-emerald-400" : "text-slate-500"}`}>
              {running ? <Radio size={11} className="animate-pulse" /> : null}
              {running ? "RUNNING" : (status?.state ?? "OFFLINE")}
            </span>
          </div>

          <div className="space-y-3">
            <div className="p-3 bg-slate-900 border border-slate-800 space-y-1">
              <span className="text-[9px] text-slate-400 uppercase">Simulation time</span>
              <div className="text-xl font-bold text-white">{status ? `${Math.floor(status.sim_time_s / 60)}:${String(Math.floor(status.sim_time_s % 60)).padStart(2, "0")}` : "—"}</div>
              <div className="text-[10px] text-slate-500">SUMO step time (authoritative)</div>
            </div>

            <div className="p-3 bg-slate-900 border border-slate-800 space-y-1">
              <span className="text-[9px] text-slate-400 uppercase">Vehicles in simulation</span>
              <div className="text-xl font-bold text-white">{status?.vehicle_count ?? 0}</div>
              <div className="text-[10px] text-slate-500">{simVehicles} receiving telemetry in pipeline</div>
            </div>

            <div className="p-3 bg-slate-900 border border-slate-800 space-y-1">
              <span className="text-[9px] text-slate-400 uppercase">Data mode</span>
              <div className={`text-sm font-bold ${dataMode === "SIMULATION" ? "text-amber-400" : "text-red-400"}`}>
                {dataMode === "SIMULATION" ? "SIMULATION MODE" : `MODE: ${dataMode}`}
              </div>
              <div className="text-[10px] text-slate-500">
                {dataMode !== "SIMULATION"
                  ? "Set DATA_MODE=simulation in backend .env to enable SUMO."
                  : "SUMO → PositionEvent → shared pipeline"}
              </div>
            </div>

            {status?.error && (
              <div className="p-3 bg-red-500/10 border border-red-500/40 text-red-300 text-[11px]">
                {status.error}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
