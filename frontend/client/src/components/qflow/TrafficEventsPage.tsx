// ─── Traffic Events & Incident Management — LIVE incident engine data ────────
// Replaces QFlowDataStore.incidents (hard-coded E17 demo). Incidents come from
// the live incident engine (manual / provider / fleet anomaly / simulation).
// Lifecycle: DETECTED → CONFIRMED → ACTIVE → CLEARING → RESOLVED.
import React, { useState } from "react";
import { useLiveFleet } from "@/hooks/useLiveFleet";
import { liveStore } from "@/services/liveStore";
import { AlertTriangle, RefreshCw, ShieldAlert, CheckCircle2, Plus, Loader2 } from "lucide-react";
import { DataModeBadge } from "./LiveModeBadge";

const STATUS_COLORS: Record<string, string> = {
  DETECTED: "bg-amber-500/10 text-amber-400 border-amber-500/30",
  CONFIRMED: "bg-orange-500/10 text-orange-400 border-orange-500/30",
  ACTIVE: "bg-red-500/10 text-red-400 border-red-500/30",
  CLEARING: "bg-sky-500/10 text-sky-400 border-sky-500/30",
  RESOLVED: "bg-emerald-500/10 text-emerald-400 border-emerald-500/30",
};

const SOURCE_LABELS: Record<string, string> = {
  MANUAL: "DISPATCHER",
  PROVIDER: "EXTERNAL PROVIDER",
  FLEET_ANOMALY: "FLEET ANOMALY DETECTION",
  SUMO: "SIMULATION",
};

export function TrafficEventsPage({ onTriggerReoptimization }: { onTriggerReoptimization?: () => void }) {
  const { dataMode, incidents, realtimeConnected } = useLiveFleet();
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [form, setForm] = useState({ type: "ACCIDENT", severity: "HIGH", latitude: "", longitude: "", title: "" });

  const activeIncidents = incidents.filter((i) => i.status !== "RESOLVED");

  const submitIncident = async () => {
    setFormError(null);
    const lat = parseFloat(form.latitude);
    const lng = parseFloat(form.longitude);
    if (!Number.isFinite(lat) || !Number.isFinite(lng) || lat < -90 || lat > 90 || lng < -180 || lng > 180) {
      setFormError("Enter valid coordinates (lat −90..90, lng −180..180).");
      return;
    }
    setSubmitting(true);
    try {
      await liveStore.createIncident({
        type: form.type,
        severity: form.severity,
        latitude: lat,
        longitude: lng,
        title: form.title,
      });
      setShowForm(false);
      setForm({ type: "ACCIDENT", severity: "HIGH", latitude: "", longitude: "", title: "" });
    } catch (e: any) {
      setFormError(e?.message || "Incident creation failed");
    } finally {
      setSubmitting(false);
    }
  };

  const resolveIncident = async (id: string) => {
    try {
      await fetch(
        `${import.meta.env.VITE_API_BASE_URL || "/api/v1"}/incidents/${encodeURIComponent(id)}/resolve`,
        { method: "POST" }
      );
    } catch {
      /* incident stays ACTIVE until resolve succeeds — no silent disappearance */
    }
  };

  return (
    <div className="space-y-4 font-sans text-white">
      {/* Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-800">
        <div>
          <h1 className="text-xl font-bold font-mono text-white tracking-tight uppercase flex items-center">
            <AlertTriangle size={20} className="mr-2 text-red-400" /> TRAFFIC EVENTS & INCIDENT MANAGEMENT
          </h1>
          <p className="text-xs text-slate-400 font-sans">
            Live incident lifecycle. Sources: dispatcher reports, external providers, fleet anomaly detection.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowForm((s) => !s)}
            className="px-3 py-1.5 bg-red-500/10 text-red-400 border border-red-500/40 font-mono font-bold text-xs uppercase hover:bg-red-500/20"
          >
            <Plus size={13} className="inline mr-1" /> REPORT INCIDENT
          </button>
          <DataModeBadge mode={dataMode} realtimeConnected={realtimeConnected} />
        </div>
      </div>

      {/* Manual incident form */}
      {showForm && (
        <div className="p-4 bg-[#0d1015] border border-slate-800 font-mono text-xs space-y-3">
          <div className="text-[10px] uppercase text-slate-400 font-bold">Report incident — affected OSM edges are derived automatically from the coordinates</div>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
            <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })} className="bg-slate-900 border border-slate-800 px-2 py-1.5 text-white">
              {["ACCIDENT", "ROADWORK", "CONGESTION", "WEATHER", "CLOSURE"].map((t) => <option key={t}>{t}</option>)}
            </select>
            <select value={form.severity} onChange={(e) => setForm({ ...form, severity: e.target.value })} className="bg-slate-900 border border-slate-800 px-2 py-1.5 text-white">
              {["LOW", "MODERATE", "HIGH", "SEVERE"].map((s) => <option key={s}>{s}</option>)}
            </select>
            <input placeholder="Latitude" value={form.latitude} onChange={(e) => setForm({ ...form, latitude: e.target.value })} className="bg-slate-900 border border-slate-800 px-2 py-1.5 text-white placeholder:text-slate-600" />
            <input placeholder="Longitude" value={form.longitude} onChange={(e) => setForm({ ...form, longitude: e.target.value })} className="bg-slate-900 border border-slate-800 px-2 py-1.5 text-white placeholder:text-slate-600" />
            <input placeholder="Title (optional)" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className="bg-slate-900 border border-slate-800 px-2 py-1.5 text-white placeholder:text-slate-600" />
          </div>
          {formError && <div className="text-red-400">{formError}</div>}
          <button
            onClick={submitIncident}
            disabled={submitting}
            className="px-4 py-1.5 bg-red-500 hover:bg-red-600 text-black font-bold uppercase disabled:opacity-50 flex items-center gap-1.5"
          >
            {submitting ? <Loader2 size={12} className="animate-spin" /> : <ShieldAlert size={12} />} CREATE INCIDENT
          </button>
        </div>
      )}

      {/* Active incident spotlight */}
      {activeIncidents.length > 0 ? (
        <div className="p-5 bg-[#12080a] border border-red-500/40 relative overflow-hidden font-mono space-y-4">
          <div className="absolute top-0 right-0 w-80 h-80 bg-red-500/5 rounded-full blur-3xl pointer-events-none" />
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-3 border-b border-red-500/30">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded bg-red-500/20 border border-red-500/50 flex items-center justify-center text-red-400">
                <ShieldAlert size={20} />
              </div>
              <div>
                <div className="text-xs text-red-400 font-bold uppercase tracking-widest flex items-center">
                  <span className="w-2 h-2 rounded-full bg-red-500 animate-ping mr-1.5" /> {activeIncidents.length} ACTIVE INCIDENT{activeIncidents.length === 1 ? "" : "S"}
                </div>
                <h2 className="text-base font-extrabold text-white">
                  {activeIncidents[0].title || `${activeIncidents[0].type} on ${activeIncidents[0].road_name || "road"}`}
                </h2>
              </div>
            </div>
            <div className="flex items-center space-x-2 text-xs">
              <span className={`px-2.5 py-1 border font-bold ${STATUS_COLORS[activeIncidents[0].status] || ""}`}>
                {activeIncidents[0].status}
              </span>
              <span className="px-2.5 py-1 bg-slate-900 text-slate-300 border border-slate-800">
                SEVERITY: {activeIncidents[0].severity}
              </span>
              <button
                onClick={() => resolveIncident(activeIncidents[0].id)}
                className="px-2.5 py-1 bg-emerald-500/10 text-emerald-400 border border-emerald-500/40 font-bold hover:bg-emerald-500/20"
              >
                RESOLVE
              </button>
            </div>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
            <div className="p-3 bg-slate-950/80 border border-slate-800">
              <span className="text-slate-400 block text-[9px] uppercase">CONFIDENCE</span>
              <span className="text-2xl font-bold text-white">{Math.round(activeIncidents[0].confidence * 100)}%</span>
            </div>
            <div className="p-3 bg-slate-950/80 border border-slate-800">
              <span className="text-slate-400 block text-[9px] uppercase">EVIDENCE COUNT</span>
              <span className="text-2xl font-bold text-white">{activeIncidents[0].evidence_count ?? 0}</span>
            </div>
            <div className="p-3 bg-slate-950/80 border border-slate-800">
              <span className="text-slate-400 block text-[9px] uppercase">AFFECTED EDGES</span>
              <span className="text-2xl font-bold text-white">{activeIncidents[0].affected_edge_ids?.length ?? 0}</span>
            </div>
            <div className="p-3 bg-slate-950/80 border border-slate-800">
              <span className="text-slate-400 block text-[9px] uppercase">SOURCE</span>
              <span className="text-[11px] font-bold text-sky-400 block mt-1">{SOURCE_LABELS[activeIncidents[0].source] || activeIncidents[0].source}</span>
            </div>
          </div>
        </div>
      ) : (
        <div className="p-6 bg-[#0d1015] border border-dashed border-slate-700 text-center font-mono">
          <CheckCircle2 size={20} className="mx-auto text-emerald-400 mb-2" />
          <div className="text-sm font-bold text-slate-300 uppercase">NO ACTIVE INCIDENTS</div>
          <div className="text-[11px] text-slate-500 mt-1">Incidents appear here when detected from telemetry anomalies, providers, or dispatcher reports — and remain visible until resolved.</div>
        </div>
      )}

      {/* Incident log */}
      <div className="bg-[#0d1015] border border-slate-800 p-4 font-mono text-xs space-y-3">
        <div className="flex items-center justify-between border-b border-slate-800 pb-2">
          <span className="font-bold text-white uppercase tracking-wider">NETWORK INCIDENT LOG</span>
          <span className="text-[10px] text-slate-400">LIVE INCIDENT ENGINE</span>
        </div>
        {incidents.length === 0 ? (
          <div className="text-slate-500 py-4 text-center">No incidents recorded in this session.</div>
        ) : (
          <div className="divide-y divide-slate-800">
            {incidents.map((incident) => (
              <div key={incident.id} className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-start space-x-3">
                  <AlertTriangle
                    size={16}
                    className={incident.severity === "SEVERE" || incident.severity === "HIGH" ? "text-red-400 shrink-0 mt-0.5" : "text-amber-400 shrink-0 mt-0.5"}
                  />
                  <div>
                    <div className="font-bold text-white flex items-center space-x-2 flex-wrap">
                      <span>{incident.title || `${incident.type} incident`}</span>
                      <span className={`text-[9px] px-1.5 py-0.5 border font-bold ${STATUS_COLORS[incident.status] || ""}`}>{incident.status}</span>
                      <span className="text-[9px] px-1.5 py-0.5 bg-slate-800 text-slate-400 font-normal">{incident.id}</span>
                    </div>
                    <div className="text-[11px] text-slate-400 font-sans mt-0.5">
                      {incident.road_name || `${incident.latitude.toFixed(5)}, ${incident.longitude.toFixed(5)}`} •{" "}
                      {SOURCE_LABELS[incident.source] || incident.source} • confidence {Math.round(incident.confidence * 100)}% •{" "}
                      detected {new Date(incident.detected_at).toLocaleTimeString()}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {incident.status !== "RESOLVED" && (
                    <button
                      onClick={() => resolveIncident(incident.id)}
                      className="px-2 py-1 bg-slate-900 text-slate-300 border border-slate-700 hover:text-white text-[10px] uppercase font-bold"
                    >
                      Resolve
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
