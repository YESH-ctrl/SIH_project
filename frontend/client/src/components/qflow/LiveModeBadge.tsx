// ─── Data provenance badges (Section 18/30/40) ───────────────────────────────
import React from "react";
import { Radio, RadioTower, FlaskConical, Clock, Wifi, WifiOff } from "lucide-react";
import type { DataMode, SourceFreshness } from "@/services/liveStore";

export function DataModeBadge({ mode, realtimeConnected }: { mode: DataMode; realtimeConnected: boolean }) {
  const config: Record<DataMode, { label: string; cls: string }> = {
    LIVE: { label: "LIVE DATA", cls: "bg-emerald-500/10 text-emerald-400 border-emerald-500/40" },
    SIMULATION: { label: "SIMULATION", cls: "bg-amber-500/10 text-amber-400 border-amber-500/40" },
    TEST: { label: "TEST DATA", cls: "bg-violet-500/10 text-violet-400 border-violet-500/40" },
    UNKNOWN: { label: "NO DATA CONNECTION", cls: "bg-red-500/10 text-red-400 border-red-500/40" },
  };
  const c = config[mode] || config.UNKNOWN;
  return (
    <div className={`flex items-center space-x-1.5 px-2.5 py-1 border font-mono text-[10px] font-bold uppercase ${c.cls}`}>
      {mode === "LIVE" ? <Radio size={12} /> : mode === "SIMULATION" ? <FlaskConical size={12} /> : <RadioTower size={12} />}
      <span>{c.label}</span>
      {realtimeConnected ? (
        <Wifi size={11} className="opacity-70" aria-label="Realtime connected" />
      ) : (
        <WifiOff size={11} className="opacity-70" aria-label="Realtime disconnected" />
      )}
    </div>
  );
}

function ageLabel(ageS: number | null): string {
  if (ageS === null) return "NO DATA";
  if (ageS < 60) return `${ageS} sec ago`;
  const m = Math.floor(ageS / 60);
  if (m < 60) return `${m} min ago`;
  return `${Math.floor(m / 60)} h ago`;
}

export function SourceFreshnessPanel({ freshness }: { freshness: SourceFreshness }) {
  const rows: { label: string; age: number | null; color: string }[] = [
    { label: "FLEET GPS", age: freshness.fleetGpsAgeS, color: "text-emerald-400" },
    { label: "EXTERNAL TRAFFIC", age: freshness.externalTrafficAgeS, color: "text-sky-400" },
    { label: "INCIDENT DATA", age: freshness.incidentDataAgeS, color: "text-amber-400" },
  ];
  return (
    <div className="font-mono text-[10px] space-y-1">
      {rows.map((r) => (
        <div key={r.label} className="flex items-center justify-between gap-3">
          <span className="text-neutral-500 flex items-center gap-1">
            <Clock size={10} /> {r.label}
          </span>
          <span className={`font-bold ${r.age === null ? "text-neutral-600" : r.color}`}>{ageLabel(r.age)}</span>
        </div>
      ))}
    </div>
  );
}

export function NoLiveDataPanel({ title, message }: { title: string; message: string }) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[220px] border border-dashed border-neutral-700 bg-neutral-900/40 p-8 text-center font-mono">
      <WifiOff size={28} className="text-neutral-600 mb-3" />
      <div className="text-sm font-bold text-neutral-300 uppercase tracking-wider">{title}</div>
      <div className="text-[11px] text-neutral-500 mt-1 max-w-md">{message}</div>
    </div>
  );
}
