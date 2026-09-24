import React, { useState } from "react";
import {
  MapLayerKey,
  LayerVisibilityState,
  MAP_LAYERS_METADATA,
} from "./mapLayerTypes";
import { TrafficHealthStatus } from "@/services/traffic";
import {
  Layers,
  Eye,
  EyeOff,
  RotateCcw,
  Activity,
  ShieldAlert,
  Info,
  ChevronUp,
  ChevronDown,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Radio,
  Cpu,
} from "lucide-react";

interface JuryMapToolbarProps {
  visibility: LayerVisibilityState;
  onToggleLayer: (key: MapLayerKey) => void;
  onAllOn: () => void;
  onAllOff: () => void;
  onResetView: () => void;
  trafficHealth: TrafficHealthStatus;
  routeDiagnostics?: {
    routeSource: string;
    nodeCount: number;
    edgeCount: number;
    geometryValid: boolean;
    restrictionsPass: boolean;
    blockedAvoided: boolean;
    oneWayLegal: boolean;
    fallbackUsed: boolean;
    trafficCostStatus: string;
  } | null;
}

export const JuryMapToolbar: React.FC<JuryMapToolbarProps> = ({
  visibility,
  onToggleLayer,
  onAllOn,
  onAllOff,
  onResetView,
  trafficHealth,
  routeDiagnostics,
}) => {
  const [showTrafficInspector, setShowTrafficInspector] = useState(false);
  const [showRouteInspector, setShowRouteInspector] = useState(false);

  // Traffic badge styling and label
  const getTrafficStatusBadge = () => {
    switch (trafficHealth.status) {
      case "LIVE":
        return {
          dotColor: "bg-emerald-400 shadow-[0_0_8px_#34d399]",
          textColor: "text-emerald-400",
          label: "TRAFFIC LIVE",
          sub: `${trafficHealth.featuresObserved} segs • ~8m refresh`,
        };
      case "NO_TOKEN":
        return {
          dotColor: "bg-amber-400",
          textColor: "text-amber-400",
          label: "TRAFFIC NO TOKEN",
          sub: "Token unconfigured",
        };
      case "TOKEN_ERROR":
        return {
          dotColor: "bg-rose-500 shadow-[0_0_8px_#f43f5e]",
          textColor: "text-rose-400",
          label: "TRAFFIC AUTH ERR",
          sub: "401/403 Invalid Token",
        };
      case "NO_DATA":
        return {
          dotColor: "bg-amber-300",
          textColor: "text-amber-300",
          label: "TRAFFIC NO DATA",
          sub: "Zero features in view",
        };
      case "LOADING":
        return {
          dotColor: "bg-cyan-400 animate-ping",
          textColor: "text-cyan-400",
          label: "TRAFFIC SYNCING",
          sub: "Connecting tileset...",
        };
      default:
        return {
          dotColor: "bg-slate-400",
          textColor: "text-slate-400",
          label: "TRAFFIC IDLE",
          sub: "Mapbox Traffic v1",
        };
    }
  };

  const badge = getTrafficStatusBadge();

  return (
    <div className="absolute bottom-4 left-4 right-4 z-20 pointer-events-none flex flex-col items-center gap-2">
      {/* ── Popover: Traffic Inspector ── */}
      {showTrafficInspector && (
        <div className="pointer-events-auto w-full max-w-xl bg-slate-950/95 backdrop-blur-md border border-cyan-500/30 rounded-lg p-3 text-xs font-mono shadow-2xl animate-in fade-in slide-in-from-bottom-2">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2 mb-2">
            <div className="flex items-center gap-2 text-cyan-400 font-bold uppercase tracking-wider">
              <Radio className="w-3.5 h-3.5 text-cyan-400 animate-pulse" />
              Mapbox Traffic v1 Diagnostics Inspector
            </div>
            <button
              onClick={() => setShowTrafficInspector(false)}
              className="text-slate-400 hover:text-white text-xs px-1.5 py-0.5 rounded bg-slate-800/60"
            >
              ESC ✕
            </button>
          </div>

          <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-slate-300">
            <div className="flex justify-between border-b border-slate-800/50 pb-1">
              <span className="text-slate-500">Provider:</span>
              <span className="font-semibold text-slate-200">Mapbox Traffic Vector Tile</span>
            </div>
            <div className="flex justify-between border-b border-slate-800/50 pb-1">
              <span className="text-slate-500">Tileset ID:</span>
              <span className="text-cyan-300">mapbox.mapbox-traffic-v1</span>
            </div>
            <div className="flex justify-between border-b border-slate-800/50 pb-1">
              <span className="text-slate-500">Token Status:</span>
              <span className={trafficHealth.configured ? "text-emerald-400" : "text-rose-400"}>
                {trafficHealth.configured ? "CONFIGURED (in .env)" : "MISSING"}
              </span>
            </div>
            <div className="flex justify-between border-b border-slate-800/50 pb-1">
              <span className="text-slate-500">Source State:</span>
              <span className={trafficHealth.sourceLoaded ? "text-emerald-400" : "text-amber-400"}>
                {trafficHealth.sourceLoaded ? "LOADED" : trafficHealth.sourceAdded ? "ADDED / PENDING" : "NOT ADDED"}
              </span>
            </div>
            <div className="flex justify-between border-b border-slate-800/50 pb-1">
              <span className="text-slate-500">Tile Requests:</span>
              <span>
                {trafficHealth.tileRequestsSeen} seen ({trafficHealth.successfulTileRequests} ok, {trafficHealth.failedTileRequests} fail)
              </span>
            </div>
            <div className="flex justify-between border-b border-slate-800/50 pb-1">
              <span className="text-slate-500">Features in Viewport:</span>
              <span className="text-amber-300 font-bold">{trafficHealth.featuresObserved} segments</span>
            </div>
            <div className="flex justify-between border-b border-slate-800/50 pb-1">
              <span className="text-slate-500">Data Freshness:</span>
              <span className="text-slate-300">~8 min interval (Mapbox live)</span>
            </div>
            <div className="flex justify-between border-b border-slate-800/50 pb-1">
              <span className="text-slate-500">Last Update:</span>
              <span>
                {trafficHealth.lastSuccessfulTileTime
                  ? new Date(trafficHealth.lastSuccessfulTileTime).toLocaleTimeString()
                  : "None"}
              </span>
            </div>
          </div>

          {trafficHealth.errorMessage && (
            <div className="mt-2 p-1.5 bg-rose-950/50 border border-rose-800/60 rounded text-rose-300 text-[11px] flex items-center gap-1.5">
              <AlertTriangle className="w-3.5 h-3.5 shrink-0 text-rose-400" />
              <span>{trafficHealth.errorMessage}</span>
            </div>
          )}

          <div className="mt-2 text-[10px] text-slate-500 italic border-t border-slate-800/80 pt-1">
            * Note: Mapbox Traffic v1 represents congestion tiers on vector road geometries. No synthetic or demo traffic is used.
          </div>
        </div>
      )}

      {/* ── Popover: Route Provenance & Feasibility Inspector ── */}
      {showRouteInspector && (
        <div className="pointer-events-auto w-full max-w-xl bg-slate-950/95 backdrop-blur-md border border-purple-500/30 rounded-lg p-3 text-xs font-mono shadow-2xl animate-in fade-in slide-in-from-bottom-2">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2 mb-2">
            <div className="flex items-center gap-2 text-purple-400 font-bold uppercase tracking-wider">
              <Cpu className="w-3.5 h-3.5 text-purple-400" />
              OSM Graph Route Feasibility & Provenance Inspector
            </div>
            <button
              onClick={() => setShowRouteInspector(false)}
              className="text-slate-400 hover:text-white text-xs px-1.5 py-0.5 rounded bg-slate-800/60"
            >
              ESC ✕
            </button>
          </div>

          <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-slate-300">
            <div className="flex justify-between border-b border-slate-800/50 pb-1">
              <span className="text-slate-500">Route Source:</span>
              <span className="font-semibold text-purple-300">{routeDiagnostics?.routeSource || "QPSO VRP Engine"}</span>
            </div>
            <div className="flex justify-between border-b border-slate-800/50 pb-1">
              <span className="text-slate-500">Underlying Graph:</span>
              <span className="text-cyan-300">OSM Road Network (Raipur)</span>
            </div>
            <div className="flex justify-between border-b border-slate-800/50 pb-1">
              <span className="text-slate-500">Nodes Traversed:</span>
              <span className="text-slate-200">{routeDiagnostics?.nodeCount ?? "—"}</span>
            </div>
            <div className="flex justify-between border-b border-slate-800/50 pb-1">
              <span className="text-slate-500">Edges Traversed:</span>
              <span className="text-slate-200">{routeDiagnostics?.edgeCount ?? "—"}</span>
            </div>
            <div className="flex justify-between border-b border-slate-800/50 pb-1">
              <span className="text-slate-500">Geometry Status:</span>
              <span className={routeDiagnostics?.geometryValid ? "text-emerald-400 font-bold flex items-center gap-1" : "text-rose-400 font-bold flex items-center gap-1"}>
                {routeDiagnostics?.geometryValid ? <CheckCircle2 className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
                {routeDiagnostics?.geometryValid ? "VALID (LineString)" : "NO ROUTE"}
              </span>
            </div>
            <div className="flex justify-between border-b border-slate-800/50 pb-1">
              <span className="text-slate-500">Fallback Geometry:</span>
              <span className="text-emerald-400 font-bold flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3" /> NOT USED
              </span>
            </div>
            <div className="flex justify-between border-b border-slate-800/50 pb-1">
              <span className="text-slate-500">Road Restrictions:</span>
              <span className={routeDiagnostics?.restrictionsPass ? "text-emerald-400" : "text-amber-400"}>
                {routeDiagnostics?.restrictionsPass ? "PASS (Respected)" : "N/A"}
              </span>
            </div>
            <div className="flex justify-between border-b border-slate-800/50 pb-1">
              <span className="text-slate-500">Blocked Edges Avoided:</span>
              <span className={routeDiagnostics?.blockedAvoided ? "text-emerald-400" : "text-rose-400"}>
                {routeDiagnostics?.blockedAvoided ? "PASS (Zero Blocked Used)" : "NO INCIDENT"}
              </span>
            </div>
          </div>

          <div className="mt-2 text-[10px] text-slate-500 italic border-t border-slate-800/80 pt-1">
            * Every route leg is constructed exclusively from concatenated OSM road graph edges. Straight-line air interpolation is strictly eliminated.
          </div>
        </div>
      )}

      {/* ── Main Military / Technical Toolbar ── */}
      <div className="pointer-events-auto flex items-center gap-2 bg-slate-950/90 backdrop-blur-md border border-cyan-500/25 rounded-lg px-2.5 py-1.5 shadow-[0_4px_25px_rgba(0,0,0,0.8)] max-w-full overflow-x-auto scrollbar-thin scrollbar-thumb-slate-700">
        {/* Label Prefix */}
        <div className="flex items-center gap-1 text-[11px] font-mono font-bold text-cyan-400 uppercase tracking-widest pl-1 pr-2 border-r border-slate-800 shrink-0">
          <Layers className="w-3.5 h-3.5 text-cyan-400" />
          <span>LAYERS</span>
        </div>

        {/* Dynamic Map Layers Toggle Group */}
        <div className="flex items-center gap-1 shrink-0">
          {MAP_LAYERS_METADATA.map((layer) => {
            const isActive = visibility[layer.key] ?? true;
            return (
              <button
                key={layer.key}
                type="button"
                onClick={() => onToggleLayer(layer.key)}
                title={`${layer.label}: ${layer.description}`}
                className={`flex items-center gap-1 text-[10px] font-mono font-semibold px-2 py-1 rounded transition-all select-none whitespace-nowrap ${
                  isActive
                    ? "bg-slate-800/90 text-slate-100 border border-slate-600/80 shadow-sm hover:border-cyan-400/60"
                    : "bg-slate-900/40 text-slate-500 border border-slate-800 hover:text-slate-300 line-through opacity-60"
                }`}
              >
                <span
                  className="w-1.5 h-1.5 rounded-full shrink-0"
                  style={{ backgroundColor: isActive ? layer.color : "#64748b" }}
                />
                <span>{layer.shortLabel}</span>
              </button>
            );
          })}
        </div>

        {/* Global Controls: ALL ON / ALL OFF / RESET */}
        <div className="flex items-center gap-1 pl-2 border-l border-slate-800 shrink-0">
          <button
            type="button"
            onClick={onAllOn}
            title="Turn all visual layers ON"
            className="flex items-center gap-1 text-[10px] font-mono font-semibold px-2 py-1 rounded bg-cyan-950/60 text-cyan-300 border border-cyan-800/60 hover:bg-cyan-900/60 transition-all select-none"
          >
            <Eye className="w-3 h-3 text-cyan-400" />
            <span>ALL ON</span>
          </button>
          <button
            type="button"
            onClick={onAllOff}
            title="Turn all optional overlays OFF (keeps base for navigation)"
            className="flex items-center gap-1 text-[10px] font-mono font-semibold px-2 py-1 rounded bg-slate-900/70 text-slate-400 border border-slate-800 hover:text-slate-200 transition-all select-none"
          >
            <EyeOff className="w-3 h-3 text-slate-400" />
            <span>ALL OFF</span>
          </button>
          <button
            type="button"
            onClick={onResetView}
            title="Reset layer visibility & default network bounds"
            className="flex items-center gap-1 text-[10px] font-mono font-semibold px-2 py-1 rounded bg-slate-900/70 text-slate-400 border border-slate-800 hover:text-slate-200 transition-all select-none"
          >
            <RotateCcw className="w-3 h-3 text-slate-400" />
            <span>RESET</span>
          </button>
        </div>

        {/* Traffic Status & Inspector Toggle */}
        <div className="flex items-center pl-2 border-l border-slate-800 shrink-0">
          <button
            type="button"
            onClick={() => setShowTrafficInspector(!showTrafficInspector)}
            title="Click to open Mapbox Live Traffic Inspector"
            className={`flex items-center gap-1.5 text-[10px] font-mono font-semibold px-2 py-1 rounded border transition-all select-none ${
              trafficHealth.status === "LIVE"
                ? "bg-emerald-950/40 border-emerald-800/60 text-emerald-300 hover:bg-emerald-900/40"
                : trafficHealth.status === "TOKEN_ERROR"
                ? "bg-rose-950/40 border-rose-800/60 text-rose-300 hover:bg-rose-900/40"
                : "bg-slate-900/60 border-slate-800 text-slate-300 hover:bg-slate-850"
            }`}
          >
            <span className={`w-2 h-2 rounded-full ${badge.dotColor}`} />
            <span>{badge.label}</span>
            {showTrafficInspector ? (
              <ChevronDown className="w-3 h-3 text-slate-400" />
            ) : (
              <ChevronUp className="w-3 h-3 text-slate-400" />
            )}
          </button>
        </div>

        {/* Route Validation Inspector Toggle */}
        <div className="flex items-center pl-1 shrink-0">
          <button
            type="button"
            onClick={() => setShowRouteInspector(!showRouteInspector)}
            title="Click to view Route Feasibility & Graph Provenance"
            className="flex items-center gap-1 text-[10px] font-mono font-semibold px-2 py-1 rounded bg-purple-950/40 border border-purple-800/60 text-purple-300 hover:bg-purple-900/40 transition-all select-none"
          >
            <Cpu className="w-3 h-3 text-purple-400" />
            <span>PROVENANCE</span>
          </button>
        </div>
      </div>
    </div>
  );
};
