// ─── Live Fleet Operations — REAL backend telemetry ──────────────────────────
// Replaces the QFlowDataStore.vehicles fake fleet. Every value shown derives
// from actual backend state (Section 17). Empty state: NO LIVE VEHICLE DATA.
import React, { useEffect, useMemo, useState } from "react";
import { Truck, Navigation, Search, X, Clock, Gauge, Route, Repeat, AlertTriangle, MapPin, Activity, Signal } from "lucide-react";
import { useLiveFleet } from "@/hooks/useLiveFleet";
import { liveStore } from "@/services/liveStore";
import { DataModeBadge, SourceFreshnessPanel, NoLiveDataPanel } from "./LiveModeBadge";
import { LiveOperationsMap } from "./LiveOperationsMap";

const STATUS_COLORS: Record<string, string> = {
  LIVE: "bg-emerald-500/10 text-emerald-400 border-emerald-500/30",
  DEGRADED: "bg-amber-500/10 text-amber-400 border-amber-500/30",
  STALE: "bg-orange-500/10 text-orange-400 border-orange-500/30",
  OFFLINE: "bg-slate-500/10 text-slate-400 border-slate-500/30",
};

function fmtAgo(iso: string | null | undefined): string {
  if (!iso) return "—";
  const age = Math.round((Date.now() - new Date(iso).getTime()) / 1000);
  if (!Number.isFinite(age)) return "—";
  if (age < 0) return "now";
  if (age < 60) return `${age} sec ago`;
  const m = Math.floor(age / 60);
  if (m < 60) return `${m} min ago`;
  return `${Math.floor(m / 60)} h ago`;
}

function fmtEtaClock(etaS: number | null | undefined): string {
  if (etaS === null || etaS === undefined) return "—";
  const t = new Date(Date.now() + etaS * 1000);
  return t.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

export function LiveFleetPage() {
  const { dataMode, vehicles, incidents, routes, trackingCounts, realtimeConnected, freshness, loading, error } = useLiveFleet();
  const [statusFilter, setStatusFilter] = useState<string>("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedVehicleId, setSelectedVehicleId] = useState<string | null>(null);
  const [detail, setDetail] = useState<Record<string, any> | null>(null);

  useEffect(() => {
    if (selectedVehicleId) {
      liveStore.fetchVehicleDetail(selectedVehicleId).then(setDetail).catch(() => setDetail(null));
    } else {
      setDetail(null);
    }
  }, [selectedVehicleId, vehicles.length, routes]);

  const filteredVehicles = useMemo(() => {
    return vehicles.filter((v) => {
      const matchesStatus = statusFilter === "All" || v.tracking_status === statusFilter;
      const matchesSearch =
        !searchQuery ||
        v.vehicle_id.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (v.road_name || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
        (v.telemetry_source || "").toLowerCase().includes(searchQuery.toLowerCase());
      return matchesStatus && matchesSearch;
    });
  }, [vehicles, statusFilter, searchQuery]);

  const selected = vehicles.find((v) => v.vehicle_id === selectedVehicleId) || null;
  const selectedRoute = selectedVehicleId ? routes[selectedVehicleId] : undefined;

  if (loading) {
    return (
      <div className="p-8 font-mono text-xs text-slate-400">CONNECTING TO LIVE BACKEND…</div>
    );
  }

  return (
    <div className="space-y-4 font-sans text-white">
      {/* Title + provenance */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-800">
        <div>
          <h1 className="text-xl font-bold font-mono text-white tracking-tight uppercase flex items-center">
            <Truck size={20} className="mr-2 text-sky-400" /> LIVE FLEET OPERATIONS
          </h1>
          <p className="text-xs text-slate-400 font-sans">
            Real GPS telemetry → map matching → live traffic → QPSO routing. No simulated vehicles.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="bg-[#0d1015] border border-slate-800 p-2 min-w-[180px]">
            <SourceFreshnessPanel freshness={freshness} />
          </div>
          <DataModeBadge mode={dataMode} realtimeConnected={realtimeConnected} />
        </div>
      </div>

      {error && (
        <div className="p-3 bg-red-500/10 border border-red-500/40 font-mono text-xs text-red-300">
          {error}
        </div>
      )}

      {/* Tracking status KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 font-mono text-xs">
        {(["LIVE", "DEGRADED", "STALE", "OFFLINE"] as const).map((st) => (
          <div key={st} className={`p-3 bg-[#0d1015] border ${STATUS_COLORS[st].split(" ")[2]}`}>
            <div className="text-[10px] text-slate-400 uppercase">{st}</div>
            <div className="text-2xl font-bold text-white">{trackingCounts[st] ?? 0}</div>
          </div>
        ))}
      </div>

      {/* Map + detail split */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        <div className="lg:col-span-8">
          <LiveOperationsMap
            selectedVehicleId={selectedVehicleId}
            onSelectVehicle={(id) => setSelectedVehicleId(id)}
            height="480px"
          />
        </div>
        <div className="lg:col-span-4">
          <VehicleDetailsPanel
            vehicle={selected}
            detail={detail}
            route={selectedRoute}
            dataMode={dataMode}
            onClose={() => setSelectedVehicleId(null)}
          />
          {incidents.length > 0 && (
            <div className="mt-4 bg-[#0d1015] border border-slate-800 p-3 font-mono text-xs">
              <div className="text-[10px] uppercase text-slate-400 mb-2 flex items-center gap-1">
                <AlertTriangle size={11} className="text-red-400" /> ACTIVE INCIDENTS ({incidents.length})
              </div>
              {incidents.slice(0, 4).map((i) => (
                <div key={i.id} className="py-1.5 border-t border-slate-800/60 first:border-t-0">
                  <div className="flex justify-between">
                    <span className="text-slate-200 font-bold">{i.type}</span>
                    <span className="text-red-400">{i.severity}</span>
                  </div>
                  <div className="text-[10px] text-slate-500">{i.title || i.road_name} • {i.source} • conf {(i.confidence * 100).toFixed(0)}%</div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Fleet table */}
      <div className="bg-[#0d1015] border border-slate-800 p-4 font-mono text-xs space-y-4">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="relative w-full sm:w-64">
            <Search size={14} className="absolute left-3 top-2.5 text-slate-500" />
            <input
              type="text"
              placeholder="Search vehicle ID, road, source…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-900 border border-slate-800 pl-9 pr-3 py-1.5 text-xs text-white placeholder:text-slate-600 rounded-none focus:outline-none focus:border-sky-400"
            />
          </div>
          <div className="text-[11px] text-slate-400">
            SHOWING <strong className="text-white">{filteredVehicles.length}</strong> OF {vehicles.length} TRACKED VEHICLES
          </div>
        </div>

        {vehicles.length === 0 ? (
          <NoLiveDataPanel
            title="NO LIVE VEHICLE DATA"
            message="No GPS telemetry has reached the backend. Start an Android tracker (POST /api/v1/telemetry/position) or switch to SIMULATION mode. No fake vehicles are ever generated here."
          />
        ) : (
          <div className="overflow-x-auto max-h-[420px]">
            <table className="w-full text-left text-[11px]">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400 uppercase text-[9px]">
                  <th className="py-2.5 px-3">VEHICLE</th>
                  <th className="py-2.5 px-3">TRACKING</th>
                  <th className="py-2.5 px-3">SPEED</th>
                  <th className="py-2.5 px-3">ROAD</th>
                  <th className="py-2.5 px-3">LAST GPS</th>
                  <th className="py-2.5 px-3">ETA</th>
                  <th className="py-2.5 px-3">SOURCE</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {filteredVehicles.map((v) => (
                  <tr
                    key={v.vehicle_id}
                    onClick={() => setSelectedVehicleId(v.vehicle_id)}
                    className={`hover:bg-slate-900/80 cursor-pointer transition-colors ${selectedVehicleId === v.vehicle_id ? "bg-slate-900" : ""}`}
                  >
                    <td className="py-2.5 px-3 font-bold text-sky-400">{v.vehicle_id}</td>
                    <td className="py-2.5 px-3">
                      <span className={`px-2 py-0.5 text-[9px] uppercase border font-bold ${STATUS_COLORS[v.tracking_status] || STATUS_COLORS.OFFLINE}`}>
                        {v.tracking_status}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-slate-300">{v.speed_kmh != null ? `${v.speed_kmh.toFixed(0)} km/h` : "—"}</td>
                    <td className="py-2.5 px-3 text-slate-300">{v.road_name || "—"}</td>
                    <td className="py-2.5 px-3 text-slate-400">{fmtAgo(v.last_gps_timestamp)}</td>
                    <td className="py-2.5 px-3 text-white font-bold">{v.eta_s != null ? fmtEtaClock(v.eta_s) : "—"}</td>
                    <td className="py-2.5 px-3 text-slate-500 uppercase">{v.telemetry_source || "—"}</td>
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

// ─── Vehicle Details Panel (Section 17) ───────────────────────────────────────
function VehicleDetailsPanel({
  vehicle, detail, route, dataMode, onClose,
}: {
  vehicle: ReturnType<typeof useLiveFleet>["vehicles"][number] | null;
  detail: Record<string, any> | null;
  route: { route_id: string; reason?: string; eta_seconds?: number | null } | undefined;
  dataMode: string;
  onClose: () => void;
}) {
  if (!vehicle) {
    return (
      <div className="bg-[#0d1015] border border-slate-800 p-4 font-mono text-xs h-full flex items-center justify-center text-slate-500 min-h-[200px]">
        SELECT A VEHICLE ON THE MAP OR TABLE
      </div>
    );
  }
  const d = detail;
  return (
    <div className="bg-[#0d1015] border border-slate-800 p-4 font-mono text-xs space-y-3">
      <div className="flex items-center justify-between border-b border-slate-800 pb-2">
        <div>
          <div className="text-base font-bold text-sky-400">{vehicle.vehicle_id}</div>
          <div className="text-[10px] text-slate-500 uppercase">{vehicle.name || "Tracked vehicle"}</div>
        </div>
        <div className="flex items-center gap-2">
          <span className={`px-2 py-0.5 text-[9px] uppercase border font-bold ${STATUS_COLORS[vehicle.tracking_status] || STATUS_COLORS.OFFLINE}`}>
            {vehicle.tracking_status}
          </span>
          <button onClick={onClose} className="text-slate-500 hover:text-white"><X size={14} /></button>
        </div>
      </div>

      <Row icon={<Clock size={11} />} label="Last GPS update" value={fmtAgo(vehicle.last_gps_timestamp)} />
      <Row icon={<Signal size={11} />} label="GPS accuracy" value={d?.gps_accuracy_m != null ? `±${Number(d.gps_accuracy_m).toFixed(1)} m` : vehicle.gps_accuracy_m != null ? `±${Number(vehicle.gps_accuracy_m).toFixed(1)} m` : "—"} />
      <Row icon={<MapPin size={11} />} label="Coordinates" value={vehicle.lat != null ? `${vehicle.lat.toFixed(5)}, ${vehicle.lng!.toFixed(5)}` : "—"} />
      <Row icon={<Gauge size={11} />} label="Speed" value={vehicle.speed_kmh != null ? `${vehicle.speed_kmh.toFixed(0)} km/h` : "—"} />
      <Row icon={<Navigation size={11} />} label="Heading" value={vehicle.heading_deg != null ? `${vehicle.heading_deg.toFixed(0)}°` : "—"} />
      <Row icon={<Route size={11} />} label="Matched road" value={d?.matched_road?.road_name || vehicle.road_name || "—"} />
      <Row
        icon={<Activity size={11} />}
        label="Traffic on road"
        value={d?.traffic ? `${d.traffic.level}${d.traffic.observed_kmh != null ? ` • ${d.traffic.observed_kmh} km/h` : ""}` : "UNKNOWN"}
      />
      <Row icon={<Route size={11} />} label="Current route" value={route?.route_id || vehicle.route_id || "—"} />
      <Row icon={<Clock size={11} />} label="Current ETA" value={route?.eta_seconds != null ? fmtEtaClock(route.eta_seconds) : vehicle.eta_s != null ? fmtEtaClock(vehicle.eta_s) : "—"} />
      <Row icon={<Repeat size={11} />} label="Last QPSO reroute" value={fmtAgo(vehicle.last_reroute_at)} />
      <Row icon={<AlertTriangle size={11} />} label="Reroute reason" value={vehicle.last_reroute_reason || route?.reason || "—"} />
      <Row icon={<Signal size={11} />} label="Telemetry source" value={`${(vehicle.telemetry_source || "—").toUpperCase()} • ${vehicle.telemetry_source_mode || dataMode}`} />
    </div>
  );
}

function Row({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <span className="text-slate-500 flex items-center gap-1.5 uppercase text-[10px]">{icon} {label}</span>
      <span className="text-white font-bold text-right">{value}</span>
    </div>
  );
}
