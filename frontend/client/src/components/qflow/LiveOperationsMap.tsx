// ─── Live Operations Map — REAL backend data over MapLibre/OSM ───────────────
// Layers: OSM raster basemap → traffic edge coloring (actual edge state) →
// active incidents → live vehicles (real GPS) → selected route / previous route
// / new QPSO route. Markers move ONLY between real GPS updates (CSS transition
// between consecutive fixes); no simulated animation.
import React, { useEffect, useMemo, useRef, useState } from "react";
import * as maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { Layers, MapPin, Truck, AlertTriangle, Activity } from "lucide-react";
import {
  liveStore,
  type LiveVehicle,
  type TrafficEdgeState,
  type LiveIncident,
  type VehicleRoute,
  type DataMode,
} from "@/services/liveStore";

const LEVEL_COLORS: Record<string, string> = {
  GREEN: "#10b981",
  YELLOW: "#ffd400",
  ORANGE: "#ff8c00",
  RED: "#e53935",
  BLOCKED: "#7f1d1d",
  UNKNOWN: "#6b7280",
};

interface MapProps {
  selectedVehicleId?: string | null;
  onSelectVehicle?: (vehicleId: string) => void;
  height?: string;
}

export function LiveOperationsMap({ selectedVehicleId, onSelectVehicle, height = "520px" }: MapProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const markersRef = useRef<Map<string, maplibregl.Marker>>(new Map());
  const [vehicles, setVehicles] = useState<LiveVehicle[]>([]);
  const [trafficEdges, setTrafficEdges] = useState<TrafficEdgeState[]>([]);
  const [incidents, setIncidents] = useState<LiveIncident[]>([]);
  const [routes, setRoutes] = useState<Record<string, VehicleRoute>>({});
  const [mode, setMode] = useState<DataMode>(liveStore.snapshot.data_mode);
  const [layers, setLayers] = useState({ traffic: true, vehicles: true, routes: true, incidents: true });
  const [mapReady, setMapReady] = useState(false);

  // ---- subscribe to live store -------------------------------------------
  useEffect(() => {
    const apply = () => {
      setVehicles([...liveStore.snapshot.vehicles]);
      setTrafficEdges([...liveStore.snapshot.trafficEdges]);
      setIncidents([...liveStore.snapshot.incidents]);
      setRoutes({ ...liveStore.snapshot.routes });
      setMode(liveStore.snapshot.data_mode);
    };
    apply();
    const unsub = liveStore.subscribe(apply);
    const unsubStatus = liveStore.subscribeStatus(() => setMode(liveStore.snapshot.data_mode));
    return () => {
      unsub();
      unsubStatus();
    };
  }, []);

  // ---- init map once ------------------------------------------------------
  useEffect(() => {
    if (mapRef.current || !mapContainer.current) return;
    const map = new maplibregl.Map({
      container: mapContainer.current,
      style: {
        version: 8,
        sources: {
          "osm-tiles": {
            type: "raster",
            tiles: ["https://tile.openstreetmap.org/{z}/{x}/{y}.png"],
            tileSize: 256,
            attribution: "© OpenStreetMap contributors",
          },
        },
        layers: [{ id: "osm-tiles", type: "raster", source: "osm-tiles" }],
      },
      center: [81.6296, 21.2514], // Raipur operating region (initial view only)
      zoom: 12.5,
      attributionControl: false,
    });
    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), "top-right");
    mapRef.current = map;
    map.on("load", () => {
      // Traffic edges
      map.addSource("live-traffic", { type: "geojson", data: emptyFC() });
      map.addLayer({
        id: "live-traffic-line", type: "line", source: "live-traffic",
        paint: {
          "line-color": ["get", "color"],
          "line-width": ["case", ["==", ["get", "level"], "RED"], 5, ["==", ["get", "level"], "BLOCKED"], 6, 3],
          "line-opacity": 0.85,
        },
        layout: { "line-cap": "round" },
      });
      // Incidents
      map.addSource("live-incidents", { type: "geojson", data: emptyFC() });
      map.addLayer({
        id: "live-incidents-pulse", type: "circle", source: "live-incidents",
        paint: {
          "circle-radius": 14,
          "circle-color": "#e53935",
          "circle-opacity": 0.18,
          "circle-stroke-color": "#e53935",
          "circle-stroke-width": 1.5,
        },
      });
      map.addLayer({
        id: "live-incidents-dot", type: "circle", source: "live-incidents",
        paint: { "circle-radius": 6, "circle-color": "#e53935", "circle-stroke-color": "#fff", "circle-stroke-width": 1.5 },
      });
      // Routes: previous (grey), current QPSO (lime), selected route (cyan)
      map.addSource("route-previous", { type: "geojson", data: emptyFC() });
      map.addLayer({
        id: "route-previous-line", type: "line", source: "route-previous",
        paint: { "line-color": "#6b7280", "line-width": 3, "line-dasharray": [2, 2], "line-opacity": 0.8 },
      });
      map.addSource("route-current", { type: "geojson", data: emptyFC() });
      map.addLayer({
        id: "route-current-line", type: "line", source: "route-current",
        paint: { "line-color": "#c8ff00", "line-width": 4.5, "line-opacity": 0.95 },
      });
      setMapReady(true);
    });
    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  // ---- traffic layer ------------------------------------------------------
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady) return;
    const src = map.getSource("live-traffic") as maplibregl.GeoJSONSource;
    if (!src) return;
    const features = trafficEdges
      .filter((e) => (e.geometry?.coordinates?.length ?? 0) >= 2 && layers.traffic && e.level !== "UNKNOWN")
      .map((e) => ({
        type: "Feature" as const,
        properties: { level: e.level, color: LEVEL_COLORS[e.level] || LEVEL_COLORS.UNKNOWN, road: e.road_name || "" },
        geometry: { type: "LineString" as const, coordinates: e.geometry!.coordinates },
      }));
    src.setData({ type: "FeatureCollection", features });
  }, [trafficEdges, layers.traffic, mapReady]);

  // ---- incidents layer ----------------------------------------------------
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady) return;
    const src = map.getSource("live-incidents") as maplibregl.GeoJSONSource;
    if (!src) return;
    const features = layers.incidents
      ? incidents
          .filter((i) => i.status !== "RESOLVED" && Number.isFinite(i.latitude) && Number.isFinite(i.longitude))
          .map((i) => ({
            type: "Feature" as const,
            properties: { id: i.id, title: i.title || i.type, severity: i.severity, status: i.status, source: i.source },
            geometry: { type: "Point" as const, coordinates: [i.longitude, i.latitude] },
          }))
      : [];
    src.setData({ type: "FeatureCollection", features });
  }, [incidents, layers.incidents, mapReady]);

  // ---- routes layer (previous + current QPSO route) ------------------------
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady) return;
    const prevSrc = map.getSource("route-previous") as maplibregl.GeoJSONSource | undefined;
    const curSrc = map.getSource("route-current") as maplibregl.GeoJSONSource | undefined;
    if (!prevSrc || !curSrc) return;
    const route = selectedVehicleId ? routes[selectedVehicleId] : undefined;
    if (!route || !layers.routes) {
      prevSrc.setData(emptyFC());
      curSrc.setData(emptyFC());
      return;
    }
    const line = {
      type: "Feature" as const,
      properties: { route_id: route.route_id },
      geometry: { type: "LineString" as const, coordinates: route.polyline },
    };
    curSrc.setData({ type: "FeatureCollection", features: [line] });
    prevSrc.setData(emptyFC()); // previous route appears in the route_history panel
  }, [routes, selectedVehicleId, layers.routes, mapReady]);

  // ---- vehicle markers (real GPS positions only) ---------------------------
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady) return;

    const visible = layers.vehicles
      ? vehicles.filter((v) => Number.isFinite(v.lat) && Number.isFinite(v.lng))
      : [];

    // remove markers for vanished vehicles
    for (const id of Array.from(markersRef.current.keys())) {
      const marker = markersRef.current.get(id)!;
      if (!visible.find((v) => v.vehicle_id === id)) {
        marker.remove();
        markersRef.current.delete(id);
      }
    }

    for (const v of visible) {
      const lngLat: [number, number] = [v.lng!, v.lat!];
      let marker = markersRef.current.get(v.vehicle_id);
      const color =
        v.tracking_status === "LIVE" ? "#10b981" :
        v.tracking_status === "DEGRADED" ? "#ffd400" :
        v.tracking_status === "STALE" ? "#ff8c00" : "#6b7280";

      if (!marker) {
        const el = document.createElement("div");
        el.style.cssText = `width:14px;height:14px;border-radius:50%;background:${color};border:2px solid #fff;box-shadow:0 0 8px ${color};cursor:pointer;transition:transform .9s linear;`;
        el.title = `${v.vehicle_id} — ${v.tracking_status}`;
        el.addEventListener("click", () => onSelectVehicle?.(v.vehicle_id));
        marker = new maplibregl.Marker({ element: el }).setLngLat(lngLat).addTo(map);
        markersRef.current.set(v.vehicle_id, marker);
      } else {
        // CSS transition gives smooth movement ONLY between actual GPS updates
        const el = marker.getElement();
        el.style.background = color;
        marker.setLngLat(lngLat);
      }
    }
  }, [vehicles, layers.vehicles, mapReady, onSelectVehicle]);

  // ---- fit to live vehicles on first arrival -------------------------------
  const fittedRef = useRef(false);
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady || fittedRef.current) return;
    const pts = vehicles.filter((v) => Number.isFinite(v.lat) && Number.isFinite(v.lng));
    if (pts.length >= 1) {
      fittedRef.current = true;
      if (pts.length === 1) {
        map.easeTo({ center: [pts[0].lng!, pts[0].lat!], zoom: 14 });
      } else {
        const bounds = new maplibregl.LngLatBounds();
        pts.forEach((v) => bounds.extend([v.lng!, v.lat!]));
        map.fitBounds(bounds, { padding: 80, maxZoom: 15, duration: 800 });
      }
    }
  }, [vehicles, mapReady]);

  const liveCount = vehicles.filter((v) => v.tracking_status === "LIVE" || v.tracking_status === "DEGRADED").length;

  return (
    <div className="relative w-full border border-slate-800 rounded-none overflow-hidden select-none font-sans text-white bg-[#090b0e]" style={{ height }}>
      {/* Header overlay */}
      <div className="absolute top-3 left-3 right-3 z-10 flex flex-wrap items-center justify-between gap-2 p-2 bg-[#0d1015]/90 border border-slate-800 backdrop-blur text-xs font-mono">
        <div className="flex items-center space-x-2">
          <span className={`w-2 h-2 rounded-full ${mode === "LIVE" ? "bg-emerald-400 animate-pulse" : mode === "SIMULATION" ? "bg-amber-400" : "bg-red-500"}`} />
          <span className="font-bold uppercase tracking-wider text-slate-200">LIVE OPERATIONS MAP</span>
          <span className={`text-[10px] font-bold px-1.5 py-0.5 border ${
            mode === "LIVE" ? "text-emerald-400 border-emerald-500/40 bg-emerald-500/10" :
            mode === "SIMULATION" ? "text-amber-400 border-amber-500/40 bg-amber-500/10" :
            "text-red-400 border-red-500/40 bg-red-500/10"}`}>
            {mode === "LIVE" ? "LIVE DATA" : mode === "SIMULATION" ? "SIMULATION" : "NO DATA CONNECTION"}
          </span>
        </div>
        <div className="flex items-center space-x-1">
          <span className="text-[10px] text-slate-500 uppercase mr-1 flex items-center"><Layers size={11} className="mr-1" /> LAYERS:</span>
          {(Object.keys(layers) as (keyof typeof layers)[]).map((key) => (
            <button
              key={key}
              onClick={() => setLayers((prev) => ({ ...prev, [key]: !prev[key] }))}
              className={`px-2 py-0.5 text-[10px] uppercase font-mono border transition-all ${
                layers[key] ? "bg-slate-800 text-emerald-400 border-slate-700 font-semibold" : "bg-slate-900/60 text-slate-500 border-slate-800/80"
              }`}
            >
              {key}
            </button>
          ))}
        </div>
      </div>

      {/* Map canvas */}
      <div ref={mapContainer} className="w-full h-full" />

      {/* Empty-state overlay: honest NO LIVE VEHICLE DATA */}
      {mapReady && vehicles.length === 0 && (
        <div className="absolute inset-0 z-10 flex items-center justify-center pointer-events-none">
          <div className="bg-[#0d1015]/95 border border-slate-700 px-6 py-5 text-center font-mono max-w-sm pointer-events-auto">
            <Truck size={22} className="mx-auto text-slate-500 mb-2" />
            <div className="text-sm font-bold text-slate-200 uppercase">NO LIVE VEHICLE DATA</div>
            <div className="text-[11px] text-slate-500 mt-1">
              Vehicles appear here only when real GPS telemetry arrives (POST /api/v1/telemetry/position).
              {mode === "SIMULATION" && " Start the simulation to generate SIMULATED telemetry."}
            </div>
          </div>
        </div>
      )}

      {/* Legend */}
      <div className="absolute bottom-3 left-3 z-10 bg-[#0d1015]/90 border border-slate-800 p-2 font-mono text-[9px] space-y-0.5">
        {(Object.keys(LEVEL_COLORS) as string[]).filter((k) => k !== "UNKNOWN").map((lvl) => (
          <div key={lvl} className="flex items-center gap-2">
            <span className="inline-block w-3 h-1" style={{ background: LEVEL_COLORS[lvl] }} />
            <span className="text-slate-400">{lvl}</span>
          </div>
        ))}
        <div className="pt-1 mt-1 border-t border-slate-800 text-slate-500">
          {liveCount} LIVE VEHICLE{liveCount === 1 ? "" : "S"} • {incidents.length} INCIDENT{incidents.length === 1 ? "" : "S"}
        </div>
      </div>
    </div>
  );
}

function emptyFC() {
  return { type: "FeatureCollection" as const, features: [] };
}
