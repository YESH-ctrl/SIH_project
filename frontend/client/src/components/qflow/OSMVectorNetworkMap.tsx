import React, { useEffect, useRef, useState, useCallback } from "react";
import * as maplibregl from "maplibre-gl";
import type { Feature, FeatureCollection } from "geojson";
import "maplibre-gl/dist/maplibre-gl.css";
import { NetworkNodeDTO, NetworkEdgeDTO, ShortestPathRouteResponse, VehicleRouteResult, DepotData, DeliveryPointData, IncidentSimulationResponse, RerouteResponse } from "@/services/apiClient";
import { ZoomIn, ZoomOut, Maximize2, Activity, AlertCircle, Compass } from "lucide-react";

export interface RouteTurnStep {
  stepNumber: number;
  maneuver: "START" | "STRAIGHT" | "SLIGHT_RIGHT" | "RIGHT" | "SHARP_RIGHT" | "SLIGHT_LEFT" | "LEFT" | "SHARP_LEFT" | "ARRIVE";
  icon: string;
  instruction: string;
  roadName: string;
  distanceMeters: number;
  distanceKm: string;
  cumulativeDistanceKm: string;
  lat: number;
  lng: number;
  nodeId?: string;
}

interface PointLocation {
  lat: number;
  lng: number;
  nodeId?: string;
}

interface OSMVectorNetworkMapProps {
  nodes: NetworkNodeDTO[];
  edges: NetworkEdgeDTO[];
  selectedEdge: NetworkEdgeDTO | null;
  selectedNode: NetworkNodeDTO | null;
  routeResponse: ShortestPathRouteResponse | null;
  mapMode: "NETWORK" | "ROUTE";
  sourcePoint: PointLocation | null;
  targetPoint: PointLocation | null;
  layerVisibility: {
    basemap: boolean;
    roadNetwork: boolean;
    nodes: boolean;
    route: boolean;
    labels: boolean;
  };
  fitTrigger?: number;
  vrpRoutes?: VehicleRouteResult[];
  depot?: DepotData;
  deliveryPoints?: DeliveryPointData[];
  incident?: IncidentSimulationResponse | null;
  rerouteResult?: RerouteResponse | null;
  currentStep?: number;
  activeTurnIndex?: number | null;
  onTurnSelect?: (turnIndex: number) => void;
  onSelectEdge: (edge: NetworkEdgeDTO | null) => void;
  onSelectNode: (node: NetworkNodeDTO | null) => void;
  onMapClick?: (lat: number, lng: number) => void;
  isLoading?: boolean;
}

// ─── Turn Guidance Extractor ──────────────────────────────────────────────────
export function computeRouteTurnSteps(
  routeResponse: ShortestPathRouteResponse | null,
  nodes: NetworkNodeDTO[],
  edges: NetworkEdgeDTO[]
): RouteTurnStep[] {
  if (!routeResponse) return [];

  const nodeMap = new Map<string, NetworkNodeDTO>();
  nodes.forEach((n) => {
    if (n && n.id) nodeMap.set(String(n.id).toLowerCase(), n);
  });

  const edgeMap = new Map<string, NetworkEdgeDTO>();
  edges.forEach((e) => {
    if (e && e.from_node_id && e.to_node_id) {
      const key = `${String(e.from_node_id).toLowerCase()}->${String(e.to_node_id).toLowerCase()}`;
      edgeMap.set(key, e);
      const revKey = `${String(e.to_node_id).toLowerCase()}->${String(e.from_node_id).toLowerCase()}`;
      if (!edgeMap.has(revKey)) edgeMap.set(revKey, e);
    }
  });

  const nodeIds = routeResponse.node_ids || routeResponse.node_path || [];
  if (nodeIds.length < 2) return [];

  const pathNodes: { id: string; lat: number; lng: number; roadName: string; lengthMeters: number }[] = [];
  for (let i = 0; i < nodeIds.length; i++) {
    const nid = String(nodeIds[i]).toLowerCase();
    const nd = nodeMap.get(nid);
    if (!nd) continue;

    let roadName = "Urban Corridor";
    let lengthMeters = 0;

    if (i < nodeIds.length - 1) {
      const nextId = String(nodeIds[i + 1]).toLowerCase();
      const edge = edgeMap.get(`${nid}->${nextId}`);
      if (edge) {
        if (edge.road_name) roadName = edge.road_name;
        if (edge.length_meters) lengthMeters = Number(edge.length_meters);
      }
    }

    pathNodes.push({
      id: nid,
      lat: Number(nd.lat),
      lng: Number(nd.lng),
      roadName,
      lengthMeters,
    });
  }

  if (pathNodes.length < 2) return [];

  function getBearing(p1: { lat: number; lng: number }, p2: { lat: number; lng: number }): number {
    const lat1 = (p1.lat * Math.PI) / 180;
    const lat2 = (p2.lat * Math.PI) / 180;
    const dLng = ((p2.lng - p1.lng) * Math.PI) / 180;
    const y = Math.sin(dLng) * Math.cos(lat2);
    const x = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLng);
    return ((Math.atan2(y, x) * 180) / Math.PI + 360) % 360;
  }

  function getCardinal(brng: number): string {
    const directions = ["North", "North-East", "East", "South-East", "South", "South-West", "West", "North-West"];
    return directions[Math.round(brng / 45) % 8];
  }

  const steps: RouteTurnStep[] = [];
  let cumulativeDist = 0;

  // Step 1: Start
  const p0 = pathNodes[0];
  const p1 = pathNodes[1];
  const brng0 = getBearing(p0, p1);
  const card0 = getCardinal(brng0);

  steps.push({
    stepNumber: 1,
    maneuver: "START",
    icon: "🟢",
    instruction: `Start at Source A — Head ${card0} on ${p0.roadName}`,
    roadName: p0.roadName,
    distanceMeters: Math.round(p0.lengthMeters),
    distanceKm: (p0.lengthMeters / 1000).toFixed(2),
    cumulativeDistanceKm: "0.00",
    lat: p0.lat,
    lng: p0.lng,
    nodeId: p0.id,
  });

  cumulativeDist += p0.lengthMeters;
  let segDist = 0;

  // Middle turns
  for (let i = 1; i < pathNodes.length - 1; i++) {
    const prev = pathNodes[i - 1];
    const curr = pathNodes[i];
    const next = pathNodes[i + 1];

    const inB = getBearing(prev, curr);
    const outB = getBearing(curr, next);
    const diff = (outB - inB + 540) % 360 - 180;

    segDist += curr.lengthMeters;

    const isRoadChange = curr.roadName !== prev.roadName && curr.roadName !== "Urban Corridor";
    const isSignificantTurn = Math.abs(diff) >= 20;

    if (isSignificantTurn || isRoadChange || i === pathNodes.length - 2) {
      let maneuver: RouteTurnStep["maneuver"] = "STRAIGHT";
      let icon = "⬆️";
      let verb = "Continue straight";

      if (diff >= 135 || diff <= -135) {
        maneuver = "SHARP_RIGHT"; icon = "↩️"; verb = "Make U-turn";
      } else if (diff >= 55) {
        maneuver = "RIGHT"; icon = "➡️"; verb = "Turn Right";
      } else if (diff >= 20) {
        maneuver = "SLIGHT_RIGHT"; icon = "↗️"; verb = "Bear Right";
      } else if (diff <= -55) {
        maneuver = "LEFT"; icon = "⬅️"; verb = "Turn Left";
      } else if (diff <= -20) {
        maneuver = "SLIGHT_LEFT"; icon = "↖️"; verb = "Bear Left";
      }

      const instruction = `${verb} onto ${curr.roadName}`;

      steps.push({
        stepNumber: steps.length + 1,
        maneuver,
        icon,
        instruction,
        roadName: curr.roadName,
        distanceMeters: Math.round(segDist),
        distanceKm: (segDist / 1000).toFixed(2),
        cumulativeDistanceKm: (cumulativeDist / 1000).toFixed(2),
        lat: curr.lat,
        lng: curr.lng,
        nodeId: curr.id,
      });

      cumulativeDist += curr.lengthMeters;
      segDist = 0;
    }
  }

  // Final Step: Destination
  const pEnd = pathNodes[pathNodes.length - 1];
  steps.push({
    stepNumber: steps.length + 1,
    maneuver: "ARRIVE",
    icon: "🏁",
    instruction: `Arrive at Destination B (${pEnd.roadName})`,
    roadName: pEnd.roadName,
    distanceMeters: 0,
    distanceKm: "0.00",
    cumulativeDistanceKm: (cumulativeDist / 1000).toFixed(2),
    lat: pEnd.lat,
    lng: pEnd.lng,
    nodeId: pEnd.id,
  });

  return steps;
}

// ─── Route Source/Layer IDs (Q-FLOW canonical) ───────────────────────────────
const ROUTE_SOURCE_ID = "qflow-route";
const ROUTE_LAYER_CASING = "qflow-route-casing";
const ROUTE_LAYER_GLOW = "qflow-route-glow";
const ROUTE_LAYER_LINE = "qflow-route-line";
const ROUTE_LAYER_ARROWS = "qflow-route-arrows";

// ─── Extract [lng, lat] coordinates from routeResponse ───────────────────────
function extractRouteCoords(
  routeResponse: ShortestPathRouteResponse | null,
  nodeMap: Map<string, { lat: number; lng: number }>
): [number, number][] {
  if (!routeResponse) return [];

  // Priority 1: geometry.coordinates (authoritative — [lng, lat])
  let geom: any = routeResponse.geometry;
  if (typeof geom === "string") {
    try { geom = JSON.parse(geom); } catch { geom = null; }
  }
  if (
    geom &&
    geom.type === "LineString" &&
    Array.isArray(geom.coordinates) &&
    geom.coordinates.length >= 2
  ) {
    const coords = geom.coordinates.map((pt: any) => [Number(pt[0]), Number(pt[1])] as [number, number]);
    console.log(
      `[Q-FLOW Route] geometry.coordinates: ${coords.length} pts | ` +
      `first=[${coords[0]}] last=[${coords[coords.length - 1]}]`
    );
    return coords;
  }

  // Priority 2: path_coordinates ([lat, lng] → convert to [lng, lat])
  if (
    Array.isArray(routeResponse.path_coordinates) &&
    routeResponse.path_coordinates.length >= 2
  ) {
    const coords = routeResponse.path_coordinates.map(
      (pt: any) => [Number(pt[1]), Number(pt[0])] as [number, number]
    );
    console.log(`[Q-FLOW Route] path_coordinates fallback: ${coords.length} pts`);
    return coords;
  }

  // Priority 3: node_ids lookup in nodeMap
  if (
    Array.isArray(routeResponse.node_ids) &&
    routeResponse.node_ids.length >= 2 &&
    nodeMap.size > 0
  ) {
    const coords: [number, number][] = [];
    for (const nid of routeResponse.node_ids) {
      const nd = nodeMap.get(String(nid).toLowerCase());
      if (nd && !isNaN(nd.lat) && !isNaN(nd.lng)) {
        coords.push([nd.lng, nd.lat]);
      }
    }
    console.log(`[Q-FLOW Route] node_ids fallback: ${coords.length} pts`);
    return coords;
  }

  console.warn("[Q-FLOW Route] No valid geometry found in routeResponse:", routeResponse);
  return [];
}

// ─── Ensure route source exists on map ───────────────────────────────────────
function ensureRouteSource(map: maplibregl.Map): boolean {
  if (!map.getSource(ROUTE_SOURCE_ID)) {
    map.addSource(ROUTE_SOURCE_ID, {
      type: "geojson",
      data: { type: "FeatureCollection", features: [] },
    });
    console.log("[Q-FLOW Map] Added qflow-route source");
  }
  return !!map.getSource(ROUTE_SOURCE_ID);
}

// ─── Ensure route layers exist on map ────────────────────────────────────────
function ensureRouteLayers(map: maplibregl.Map): void {
  if (!map.getSource(ROUTE_SOURCE_ID)) return;

  // 1. Dark casing (navigation-style thick outline)
  if (!map.getLayer(ROUTE_LAYER_CASING)) {
    map.addLayer({
      id: ROUTE_LAYER_CASING,
      type: "line",
      source: ROUTE_SOURCE_ID,
      layout: { "line-cap": "round", "line-join": "round" },
      paint: {
        "line-color": "#020617",
        "line-width": 12,
        "line-opacity": 1.0,
      },
    });
    console.log("[Q-FLOW Map] Added qflow-route-casing layer");
  }

  // 2. Outer glow (neon effect)
  if (!map.getLayer(ROUTE_LAYER_GLOW)) {
    map.addLayer({
      id: ROUTE_LAYER_GLOW,
      type: "line",
      source: ROUTE_SOURCE_ID,
      layout: { "line-cap": "round", "line-join": "round" },
      paint: {
        "line-color": "#00f0ff",
        "line-width": 20,
        "line-opacity": 0.25,
        "line-blur": 4,
      },
    });
    console.log("[Q-FLOW Map] Added qflow-route-glow layer");
  }

  // 3. Core bright line (8px neon cyan — impossible to miss)
  if (!map.getLayer(ROUTE_LAYER_LINE)) {
    map.addLayer({
      id: ROUTE_LAYER_LINE,
      type: "line",
      source: ROUTE_SOURCE_ID,
      layout: { "line-cap": "round", "line-join": "round" },
      paint: {
        "line-color": "#00f0ff",
        "line-width": 8,
        "line-opacity": 1.0,
      },
    });
    console.log("[Q-FLOW Map] Added qflow-route-line layer");
  }

  // Move all route layers to top of z-stack (above road network)
  [ROUTE_LAYER_CASING, ROUTE_LAYER_GLOW, ROUTE_LAYER_LINE].forEach((id) => {
    if (map.getLayer(id)) map.moveLayer(id);
  });
}

// ─── Render route geometry onto map ──────────────────────────────────────────
function renderRouteOnMap(
  map: maplibregl.Map,
  lineCoords: [number, number][],
  routeResponse: ShortestPathRouteResponse
): boolean {
  if (!map) {
    console.warn("[Q-FLOW Map] Map instance not available");
    return false;
  }

  try {
    ensureRouteSource(map);
    ensureRouteLayers(map);

    const routeGeoJSON: FeatureCollection = {
      type: "FeatureCollection",
      features: [
        {
          type: "Feature",
          geometry: {
            type: "LineString",
            coordinates: lineCoords,
          },
          properties: {
            network_id: routeResponse.network_id,
            distance_meters: routeResponse.distance_meters ?? routeResponse.total_distance_meters ?? 0,
            travel_time_seconds: routeResponse.travel_time_seconds ?? routeResponse.total_travel_time_seconds ?? 0,
            algorithm: routeResponse.algorithm ?? "Dijkstra",
          },
        },
      ],
    };

    const src = map.getSource(ROUTE_SOURCE_ID) as maplibregl.GeoJSONSource;
    if (src) {
      src.setData(routeGeoJSON);
      [ROUTE_LAYER_CASING, ROUTE_LAYER_GLOW, ROUTE_LAYER_LINE].forEach((id) => {
        if (map.getLayer(id)) map.moveLayer(id);
      });
      console.log(
        `[Q-FLOW Map] ✅ Route rendered: ${lineCoords.length} coords | ` +
        `bounds: [${Math.min(...lineCoords.map(c => c[0])).toFixed(4)}, ` +
        `${Math.min(...lineCoords.map(c => c[1])).toFixed(4)}] → ` +
        `[${Math.max(...lineCoords.map(c => c[0])).toFixed(4)}, ` +
        `${Math.max(...lineCoords.map(c => c[1])).toFixed(4)}]`
      );
      return true;
    }
    return false;
  } catch (err) {
    console.error("[Q-FLOW Map] Error rendering route:", err);
    return false;
  }
}

// ─── Clear route from map ─────────────────────────────────────────────────────
function clearRouteFromMap(map: maplibregl.Map): void {
  const src = map.getSource(ROUTE_SOURCE_ID) as maplibregl.GeoJSONSource;
  if (src) {
    src.setData({ type: "FeatureCollection", features: [] });
  }
}

// ─── Fit map to route bounds ──────────────────────────────────────────────────
function fitMapToRoute(map: maplibregl.Map, lineCoords: [number, number][]): void {
  if (lineCoords.length < 2) return;
  let minLng = 180, maxLng = -180, minLat = 90, maxLat = -90;
  lineCoords.forEach(([lng, lat]) => {
    if (lng < minLng) minLng = lng;
    if (lng > maxLng) maxLng = lng;
    if (lat < minLat) minLat = lat;
    if (lat > maxLat) maxLat = lat;
  });
  if (minLng < maxLng && minLat < maxLat) {
    map.fitBounds([[minLng, minLat], [maxLng, maxLat]], {
      padding: 100,
      maxZoom: 16,
      duration: 800,
    });
    console.log(`[Q-FLOW Map] fitBounds to route: [${minLng.toFixed(4)},${minLat.toFixed(4)}] → [${maxLng.toFixed(4)},${maxLat.toFixed(4)}]`);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
export function OSMVectorNetworkMap({
  nodes,
  edges,
  selectedEdge,
  selectedNode,
  routeResponse,
  mapMode,
  sourcePoint,
  targetPoint,
  layerVisibility,
  fitTrigger = 0,
  vrpRoutes,
  depot,
  deliveryPoints,
  incident,
  rerouteResult,
  currentStep,
  activeTurnIndex,
  onTurnSelect,
  onSelectEdge,
  onSelectNode,
  onMapClick,
  isLoading = false,
}: OSMVectorNetworkMapProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const sourceMarkerRef = useRef<maplibregl.Marker | null>(null);
  const targetMarkerRef = useRef<maplibregl.Marker | null>(null);
  const depotMarkerRef = useRef<maplibregl.Marker | null>(null);
  const deliveryMarkersRef = useRef<maplibregl.Marker[]>([]);
  const vehicleMarkersRef = useRef<maplibregl.Marker[]>([]);
  const incidentMarkerRef = useRef<maplibregl.Marker | null>(null);
  const turnMarkersRef = useRef<maplibregl.Marker[]>([]);

  // ── State ──
  const [isMapLoaded, setIsMapLoaded] = useState(false);
  const [basemapUnavailable, setBasemapUnavailable] = useState(false);

  // ── Stable refs (avoid stale closures) ───────────────────────────────────
  const onMapClickRef = useRef(onMapClick);
  useEffect(() => { onMapClickRef.current = onMapClick; }, [onMapClick]);

  const mapModeRef = useRef(mapMode);
  useEffect(() => { mapModeRef.current = mapMode; }, [mapMode]);

  // Latest routeResponse stored in a ref so style-reload handler can access it
  const routeResponseRef = useRef<ShortestPathRouteResponse | null>(null);
  useEffect(() => { routeResponseRef.current = routeResponse; }, [routeResponse]);

  // Node map ref for fallback coordinate lookup
  const nodeMapRef = useRef<Map<string, { lat: number; lng: number }>>(new Map());
  useEffect(() => {
    const m = new Map<string, { lat: number; lng: number }>();
    nodes.forEach((n) => {
      if (n && n.id) m.set(String(n.id).toLowerCase(), { lat: Number(n.lat), lng: Number(n.lng) });
    });
    nodeMapRef.current = m;
  }, [nodes]);

  // ── Route rendering callback (callable from multiple places) ─────────────
  const renderCurrentRoute = useCallback(() => {
    const map = mapRef.current;
    const rr = routeResponseRef.current;
    if (!map || !rr) return;
    // NOTE: Do NOT check map.isStyleLoaded() here.
    // The route source and layers are added in map.on("load"), which has already fired.
    // isStyleLoaded() can return false while tiles are still downloading,
    // even after the load event — causing a silent render failure.
    // Instead, verify the source directly.
    if (!map.getSource(ROUTE_SOURCE_ID)) {
      // Source not yet available (very early call), re-add and try again
      ensureRouteSource(map);
      ensureRouteLayers(map);
    }

    const coords = extractRouteCoords(rr, nodeMapRef.current);
    if (coords.length >= 2) {
      renderRouteOnMap(map, coords, rr);
      fitMapToRoute(map, coords);
    } else {
      console.warn("[Q-FLOW Map] Could not extract valid coordinates from routeResponse");
      clearRouteFromMap(map);
    }
  }, []); // stable — reads from refs

  // ── 1. Initialize MapLibre GL ─────────────────────────────────────────────
  useEffect(() => {
    if (!mapContainerRef.current) return;

    const osmStyle: maplibregl.StyleSpecification = {
      version: 8,
      sources: {
        "osm-tiles": {
          type: "raster",
          tiles: ["https://tile.openstreetmap.org/{z}/{x}/{y}.png"],
          tileSize: 256,
          attribution:
            '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a> contributors',
        },
      },
      layers: [
        {
          id: "osm-basemap-layer",
          type: "raster",
          source: "osm-tiles",
          minzoom: 0,
          maxzoom: 19,
          paint: {
            "raster-opacity": 0.75,
            "raster-brightness-max": 0.90,
            "raster-brightness-min": 0.10,
            "raster-contrast": 0.05,
            "raster-saturation": -0.20,
          },
        },
      ],
    };

    const map = new maplibregl.Map({
      container: mapContainerRef.current,
      style: osmStyle,
      center: [81.6296, 21.2514],
      zoom: 13,
      attributionControl: false,
    });

    mapRef.current = map;

    map.on("error", (e) => {
      if (e && e.error && (e.error.message?.includes("tile") || e.error.message?.includes("http"))) {
        setBasemapUnavailable(true);
      }
    });

    map.on("load", () => {
      console.log("[Q-FLOW Map] Map loaded — initializing sources and layers");

      // GeoJSON Sources
      map.addSource("edges-source", { type: "geojson", data: { type: "FeatureCollection", features: [] } });
      map.addSource("nodes-source", { type: "geojson", data: { type: "FeatureCollection", features: [] } });
      map.addSource("route-source", { type: "geojson", data: { type: "FeatureCollection", features: [] } });
      map.addSource(ROUTE_SOURCE_ID, { type: "geojson", data: { type: "FeatureCollection", features: [] } });

      // ── Road network layers ──
      map.addLayer({
        id: "edges-casing",
        type: "line",
        source: "edges-source",
        paint: { "line-color": "#020617", "line-width": 5, "line-opacity": 0.7 },
      });
      map.addLayer({
        id: "edges-debug",
        type: "line",
        source: "edges-source",
        paint: { "line-color": "#334155", "line-width": 2.5, "line-opacity": 0.6 },
      });
      map.addLayer({
        id: "edges-primary",
        type: "line",
        source: "edges-source",
        filter: ["match", ["get", "road_type"], ["MOTORWAY", "TRUNK", "PRIMARY", "PRIMARY_LINK", "MOTORWAY_LINK"], true, false],
        paint: { "line-color": "#475569", "line-width": 3.5, "line-opacity": 0.85 },
      });
      map.addLayer({
        id: "edges-secondary",
        type: "line",
        source: "edges-source",
        filter: ["match", ["get", "road_type"], ["SECONDARY", "TERTIARY", "SECONDARY_LINK", "TERTIARY_LINK"], true, false],
        paint: { "line-color": "#3b82f6", "line-width": 2.5, "line-opacity": 0.7 },
      });
      map.addLayer({
        id: "edges-local",
        type: "line",
        source: "edges-source",
        filter: ["match", ["get", "road_type"], ["RESIDENTIAL", "LIVING_STREET", "UNCLASSIFIED", "ROAD", "SERVICE", "PATH"], true, false],
        paint: { "line-color": "#1e293b", "line-width": 2.0, "line-opacity": 0.6 },
      });
      map.addLayer({
        id: "edges-click-target",
        type: "line",
        source: "edges-source",
        paint: { "line-color": "#ffffff", "line-width": 14, "line-opacity": 0 },
      });

      // ── Nodes ──
      map.addLayer({
        id: "nodes-layer",
        type: "circle",
        source: "nodes-source",
        minzoom: 13,
        paint: {
          "circle-color": "#38bdf8",
          "circle-radius": 3.0,
          "circle-stroke-width": 1.0,
          "circle-stroke-color": "#030712",
        },
      });

      // ── Q-FLOW Route layers (added here so z-order is correct from start) ──
      ensureRouteLayers(map);

      // ── Map click handler ──
      map.on("click", (e) => {
        if (mapModeRef.current === "ROUTE" && onMapClickRef.current) {
          onMapClickRef.current(e.lngLat.lat, e.lngLat.lng);
        }
      });

      // ── Style reload guard: re-attach route source/layers on every styledata event ──
      map.on("styledata", () => {
        // Ensure route source always exists (can be lost on style reload)
        if (!map.getSource(ROUTE_SOURCE_ID)) {
          console.log("[Q-FLOW Map] styledata — re-initializing route source/layers");
          map.addSource(ROUTE_SOURCE_ID, { type: "geojson", data: { type: "FeatureCollection", features: [] } });
        }
        // Always ensure layers exist
        ensureRouteLayers(map);
        // Re-render route data if we have a response
        const rr = routeResponseRef.current;
        if (rr) {
          const coords = extractRouteCoords(rr, nodeMapRef.current);
          if (coords.length >= 2) {
            setTimeout(() => renderRouteOnMap(map, coords, rr), 50);
          }
        }
      });

      setIsMapLoaded(true);
      console.log("[Q-FLOW Map] ✅ Map fully initialized");
    });

    return () => {
      if (sourceMarkerRef.current) sourceMarkerRef.current.remove();
      if (targetMarkerRef.current) targetMarkerRef.current.remove();
      map.remove();
      mapRef.current = null;
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── 2. Update GeoJSON Sources for edges and nodes ─────────────────────────
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !isMapLoaded) return;

    const nodeMap = new Map<string, { lat: number; lng: number }>();
    nodes.forEach((n) => {
      if (n && n.id) nodeMap.set(String(n.id).toLowerCase(), { lat: Number(n.lat), lng: Number(n.lng) });
    });

    const edgeFeatures: Feature[] = [];
    let minLng = 180, maxLng = -180, minLat = 90, maxLat = -90;

    edges.forEach((edge) => {
      let rawCoords: [number, number][] = [];

      if (edge.geometry && edge.geometry.coordinates && Array.isArray(edge.geometry.coordinates) && edge.geometry.coordinates.length > 0) {
        rawCoords = edge.geometry.coordinates;
      } else {
        const uId = String(edge.from_node_id || "").toLowerCase();
        const vId = String(edge.to_node_id || "").toLowerCase();
        const u = nodeMap.get(uId);
        const v = nodeMap.get(vId);
        if (u && v && !isNaN(u.lat) && !isNaN(v.lat)) {
          rawCoords = [[u.lng, u.lat], [v.lng, v.lat]];
        }
      }

      if (rawCoords.length > 0) {
        const coords: [number, number][] = rawCoords.map(([c1, c2]) => {
          if (c1 < c2 && c1 > 5 && c1 < 40 && c2 > 60 && c2 < 100) return [c2, c1];
          return [c1, c2];
        });

        coords.forEach(([lng, lat]) => {
          if (lng < minLng) minLng = lng;
          if (lng > maxLng) maxLng = lng;
          if (lat < minLat) minLat = lat;
          if (lat > maxLat) maxLat = lat;
        });

        edgeFeatures.push({
          type: "Feature",
          geometry: { type: "LineString", coordinates: coords },
          properties: {
            id: edge.id,
            road_name: edge.road_name,
            road_type: edge.road_type ? edge.road_type.toUpperCase() : "UNCLASSIFIED",
            length_meters: edge.length_meters,
            speed_limit_kph: edge.speed_limit_kph,
            capacity_vehicles: edge.capacity_vehicles,
          },
        });
      }
    });

    const edgesGeoJSON: FeatureCollection = { type: "FeatureCollection", features: edgeFeatures };

    const nodeFeatures: Feature[] = nodes.map((node) => {
      let lng = Number(node.lng);
      let lat = Number(node.lat);
      if (lat > 60 && lng < 40) { const tmp = lng; lng = lat; lat = tmp; }

      if (lng < minLng) minLng = lng;
      if (lng > maxLng) maxLng = lng;
      if (lat < minLat) minLat = lat;
      if (lat > maxLat) maxLat = lat;

      return {
        type: "Feature",
        geometry: { type: "Point", coordinates: [lng, lat] },
        properties: { id: node.id, external_id: node.external_id, lat, lng, network_id: node.network_id },
      };
    });

    const nodesGeoJSON: FeatureCollection = { type: "FeatureCollection", features: nodeFeatures };

    const edgeSource = map.getSource("edges-source") as maplibregl.GeoJSONSource;
    if (edgeSource) edgeSource.setData(edgesGeoJSON);

    const nodeSource = map.getSource("nodes-source") as maplibregl.GeoJSONSource;
    if (nodeSource) nodeSource.setData(nodesGeoJSON);

    if (minLng < maxLng && minLat < maxLat) {
      map.fitBounds([[minLng, minLat], [maxLng, maxLat]], { padding: 40, maxZoom: 16, duration: 1200 });
    }
  }, [nodes, edges, isMapLoaded]);

  // ── 3. Render Source (A) and Destination (B) Markers ─────────────────────
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !isMapLoaded) return;

    if (sourcePoint) {
      if (!sourceMarkerRef.current) {
        const el = document.createElement("div");
        el.className = "qflow-source-marker";
        el.innerHTML = `
          <div style="background:#10b981; color:#020617; font-weight:800; font-family:monospace; font-size:12px; padding:4px 8px; border-radius:6px; border:2px solid #ffffff; box-shadow:0 0 14px #10b981; display:flex; align-items:center; gap:4px; transform:translate(-50%, -100%); cursor:pointer;">
            <span>🟢</span>
            <span>SOURCE (A)</span>
          </div>
        `;
        sourceMarkerRef.current = new maplibregl.Marker({ element: el })
          .setLngLat([sourcePoint.lng, sourcePoint.lat])
          .addTo(map);
      } else {
        sourceMarkerRef.current.setLngLat([sourcePoint.lng, sourcePoint.lat]);
      }
    } else {
      if (sourceMarkerRef.current) { sourceMarkerRef.current.remove(); sourceMarkerRef.current = null; }
    }

    if (targetPoint) {
      if (!targetMarkerRef.current) {
        const el = document.createElement("div");
        el.className = "qflow-target-marker";
        el.innerHTML = `
          <div style="background:#ef4444; color:#ffffff; font-weight:800; font-family:monospace; font-size:12px; padding:4px 8px; border-radius:6px; border:2px solid #ffffff; box-shadow:0 0 14px #ef4444; display:flex; align-items:center; gap:4px; transform:translate(-50%, -100%); cursor:pointer;">
            <span>🔴</span>
            <span>DESTINATION (B)</span>
          </div>
        `;
        targetMarkerRef.current = new maplibregl.Marker({ element: el })
          .setLngLat([targetPoint.lng, targetPoint.lat])
          .addTo(map);
      } else {
        targetMarkerRef.current.setLngLat([targetPoint.lng, targetPoint.lat]);
      }
    } else {
      if (targetMarkerRef.current) { targetMarkerRef.current.remove(); targetMarkerRef.current = null; }
    }
  }, [sourcePoint, targetPoint, isMapLoaded]);

  // ── 4. Render Q-FLOW Route Geometry ──────────────────────────────────────
  // This effect fires whenever routeResponse or isMapLoaded changes.
  // IMPORTANT: We do NOT check map.isStyleLoaded() here.
  // The route source and all layers are added in map.on("load") (which fires once).
  // isStyleLoaded() returns false while OSM raster tiles are still downloading,
  // even after the load event has fired. Using map.once("load") as a fallback
  // silently fails because "load" already fired. The correct check is whether
  // the route source already exists on the map instance.
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !isMapLoaded) return;

    if (!routeResponse) {
      clearRouteFromMap(map);
      return;
    }

    console.log("[Q-FLOW Map] ✅ routeResponse received — attempting render:", {
      network_id: routeResponse.network_id,
      node_count: routeResponse.node_count,
      edge_count: routeResponse.edge_count,
      distance_meters: routeResponse.distance_meters,
      algorithm: routeResponse.algorithm,
      geometry_type: routeResponse.geometry?.type,
      geometry_coords_length: routeResponse.geometry?.coordinates?.length,
      geometry_first: routeResponse.geometry?.coordinates?.[0],
      geometry_last: routeResponse.geometry?.coordinates?.[routeResponse.geometry?.coordinates?.length - 1],
      path_coordinates_length: routeResponse.path_coordinates?.length,
      node_ids_length: routeResponse.node_ids?.length,
    });

    // Ensure source and layers exist (they should, added in map.on("load"))
    ensureRouteSource(map);
    ensureRouteLayers(map);

    const coords = extractRouteCoords(routeResponse, nodeMapRef.current);
    if (coords.length >= 2) {
      const rendered = renderRouteOnMap(map, coords, routeResponse);
      if (rendered) {
        fitMapToRoute(map, coords);
      } else {
        // Fallback: retry after a short delay to allow GPU pipeline to settle
        console.warn("[Q-FLOW Map] renderRouteOnMap returned false — retrying in 150ms");
        setTimeout(() => {
          const m = mapRef.current;
          const rr = routeResponseRef.current;
          if (m && rr) {
            ensureRouteSource(m);
            ensureRouteLayers(m);
            const c2 = extractRouteCoords(rr, nodeMapRef.current);
            if (c2.length >= 2) {
              renderRouteOnMap(m, c2, rr);
              fitMapToRoute(m, c2);
            }
          }
        }, 150);
      }
    } else {
      console.warn("[Q-FLOW Map] No valid coords extracted from routeResponse — clearing route");
      clearRouteFromMap(map);
    }
  }, [routeResponse, isMapLoaded, renderCurrentRoute]);

  // ── 4a-1. Render Turn-by-Turn Node Markers mapped on OSM Map ───────────────
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !isMapLoaded) return;

    // Clear previous turn markers
    turnMarkersRef.current.forEach((m) => m.remove());
    turnMarkersRef.current = [];

    if (!routeResponse || mapMode !== "ROUTE") return;

    const steps = computeRouteTurnSteps(routeResponse, nodes, edges);
    if (steps.length === 0) return;

    steps.forEach((step, idx) => {
      const el = document.createElement("div");
      el.className = "qflow-turn-marker";
      const isStart = step.maneuver === "START";
      const isArrive = step.maneuver === "ARRIVE";
      const badgeBg = isStart ? "#064e3b" : isArrive ? "#7f1d1d" : "#0f172a";
      const badgeBorder = isStart ? "#10b981" : isArrive ? "#ef4444" : "#38bdf8";
      const isSelected = activeTurnIndex === idx;

      el.innerHTML = `
        <div style="background:${badgeBg}; color:#ffffff; font-weight:800; font-family:monospace; font-size:11px; padding:4px 8px; border-radius:14px; border:2px solid ${badgeBorder}; box-shadow:${isSelected ? `0 0 22px ${badgeBorder}` : `0 0 10px ${badgeBorder}`}; display:flex; align-items:center; gap:4px; transform:translate(-50%, -50%); cursor:pointer; transition:all 0.2s;">
          <span style="font-size:12px;">${step.icon}</span>
          <span style="font-weight:900; color:#ffffff;">${step.stepNumber}</span>
        </div>
      `;

      const popupHtml = `
        <div style="background:#090d16; color:#ffffff; padding:8px 12px; font-family:sans-serif; font-size:11px; border:1.5px solid ${badgeBorder}; border-radius:6px; box-shadow:0 0 16px rgba(0,0,0,0.8); max-width:220px;">
          <div style="font-weight:900; color:${badgeBorder}; font-size:12px; display:flex; align-items:center; gap:4px;">
            <span>Step ${step.stepNumber}:</span>
            <span>${step.icon}</span>
          </div>
          <div style="font-size:11px; color:#f1f5f9; font-weight:bold; margin-top:3px; line-height:1.3;">
            ${step.instruction}
          </div>
          <div style="color:#94a3b8; font-size:10px; font-family:monospace; margin-top:5px; border-top:1px solid #1e293b; padding-top:4px;">
            Segment: <span style="color:#38bdf8; font-weight:bold;">${step.distanceKm} km</span> • Cumulative: <span style="color:#10b981; font-weight:bold;">${step.cumulativeDistanceKm} km</span>
          </div>
        </div>
      `;

      const popup = new maplibregl.Popup({ offset: 15, closeButton: false }).setHTML(popupHtml);

      el.addEventListener("click", () => {
        if (onTurnSelect) onTurnSelect(idx);
        map.flyTo({ center: [step.lng, step.lat], zoom: 16, duration: 800 });
      });

      const m = new maplibregl.Marker({ element: el })
        .setLngLat([step.lng, step.lat])
        .setPopup(popup)
        .addTo(map);

      turnMarkersRef.current.push(m);
    });
  }, [routeResponse, nodes, edges, mapMode, isMapLoaded, activeTurnIndex, onTurnSelect]);

  // ── 4a-2. Fly to active turn node when selected ────────────────────────────
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !isMapLoaded || activeTurnIndex === null || activeTurnIndex === undefined) return;
    if (!routeResponse) return;

    const steps = computeRouteTurnSteps(routeResponse, nodes, edges);
    if (steps[activeTurnIndex]) {
      const step = steps[activeTurnIndex];
      map.flyTo({ center: [step.lng, step.lat], zoom: 16.2, duration: 750 });
      if (turnMarkersRef.current[activeTurnIndex]) {
        turnMarkersRef.current[activeTurnIndex].togglePopup();
      }
    }
  }, [activeTurnIndex, routeResponse, nodes, edges, isMapLoaded]);

  // ── 4a. Respond to fitTrigger (user clicked "Fit Map to Route") ──────────
  useEffect(() => {
    if (fitTrigger === 0) return; // skip initial render
    const map = mapRef.current;
    const rr = routeResponseRef.current;
    if (!map || !rr) return;
    const coords = extractRouteCoords(rr, nodeMapRef.current);
    if (coords.length >= 2) {
      fitMapToRoute(map, coords);
      console.log("[Q-FLOW Map] Fit to route triggered manually");
    }
  }, [fitTrigger]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── 4b. Render VRP Multi-Vehicle Optimization Routes ─────────────────────
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !isMapLoaded) return;
    if (!vrpRoutes || vrpRoutes.length === 0) return;

    const allLngs: number[] = [];
    const allLats: number[] = [];

    vrpRoutes.forEach((vr, idx) => {
      const srcId = `qflow-vrp-source-${idx}`;
      const casingId = `qflow-vrp-casing-${idx}`;
      const lineId = `qflow-vrp-line-${idx}`;

      const coords = vr.geometry?.coordinates || [];
      coords.forEach(([lng, lat]) => { allLngs.push(lng); allLats.push(lat); });

      const featureData: FeatureCollection = {
        type: "FeatureCollection",
        features: [{ type: "Feature", geometry: vr.geometry, properties: { vehicle_id: vr.vehicle_id, color: vr.color } }],
      };

      if (!map.getSource(srcId)) {
        map.addSource(srcId, { type: "geojson", data: featureData });
      } else {
        (map.getSource(srcId) as maplibregl.GeoJSONSource).setData(featureData);
      }

      if (!map.getLayer(casingId)) {
        map.addLayer({ id: casingId, type: "line", source: srcId, paint: { "line-color": "#060708", "line-width": 10.0, "line-opacity": 0.9 } });
      }
      if (!map.getLayer(lineId)) {
        map.addLayer({ id: lineId, type: "line", source: srcId, paint: { "line-color": vr.color || "#00f0ff", "line-width": 7.0, "line-opacity": 1.0 } });
      }

      if (map.getLayer(casingId)) map.moveLayer(casingId);
      if (map.getLayer(lineId)) map.moveLayer(lineId);
    });

    if (allLngs.length > 0 && allLats.length > 0) {
      const minLng = Math.min(...allLngs), maxLng = Math.max(...allLngs);
      const minLat = Math.min(...allLats), maxLat = Math.max(...allLats);
      if (minLng < maxLng && minLat < maxLat) {
        map.fitBounds([[minLng, minLat], [maxLng, maxLat]], { padding: 80, duration: 1000 });
      }
    }
  }, [vrpRoutes, isMapLoaded]);

  // ── 4c. Render Depot Marker ─────────────────────────────────────────────
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !isMapLoaded) return;

    const dLat = depot?.latitude || (depot as any)?.lat;
    const dLng = depot?.longitude || (depot as any)?.lng;

    if (depot && dLat && dLng) {
      if (!depotMarkerRef.current) {
        const el = document.createElement("div");
        el.className = "qflow-depot-marker";
        el.innerHTML = `
          <div style="background:#0f172a; color:#818cf8; font-weight:800; font-family:monospace; font-size:11px; padding:5px 9px; border-radius:6px; border:2px solid #6366f1; box-shadow:0 0 16px rgba(99,102,241,0.6); display:flex; align-items:center; gap:5px; transform:translate(-50%, -100%); cursor:pointer;">
            <span style="font-size:14px;">🏢</span>
            <span>DEPOT (${depot.name || "Central"})</span>
          </div>
        `;
        depotMarkerRef.current = new maplibregl.Marker({ element: el })
          .setLngLat([Number(dLng), Number(dLat)])
          .addTo(map);
      } else {
        depotMarkerRef.current.setLngLat([Number(dLng), Number(dLat)]);
      }
    } else {
      if (depotMarkerRef.current) {
        depotMarkerRef.current.remove();
        depotMarkerRef.current = null;
      }
    }
  }, [depot, isMapLoaded]);

  // ── 4d. Render Delivery Point Markers ──────────────────────────────────
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !isMapLoaded) return;

    deliveryMarkersRef.current.forEach((m) => m.remove());
    deliveryMarkersRef.current = [];

    if (deliveryPoints && deliveryPoints.length > 0) {
      const allLngs: number[] = [];
      const allLats: number[] = [];

      const dLat = depot?.latitude || (depot as any)?.lat;
      const dLng = depot?.longitude || (depot as any)?.lng;
      if (dLat && dLng) {
        allLats.push(Number(dLat));
        allLngs.push(Number(dLng));
      }

      deliveryPoints.forEach((dp, idx) => {
        const lat = Number(dp.latitude || (dp as any).lat);
        const lng = Number(dp.longitude || (dp as any).lng);
        const demand = dp.demand ?? (dp as any).demand_kg ?? 10;
        const name = dp.name || (dp as any).point_code || `Stop ${idx + 1}`;
        if (!lat || !lng || isNaN(lat) || isNaN(lng)) return;

        allLats.push(lat);
        allLngs.push(lng);

        const el = document.createElement("div");
        el.className = "qflow-delivery-marker";
        el.innerHTML = `
          <div style="background:#0f172a; color:#cbd5e1; font-weight:700; font-family:monospace; font-size:10px; padding:4px 7px; border-radius:6px; border:1.5px solid #38bdf8; box-shadow:0 0 12px rgba(56,189,248,0.5); display:flex; align-items:center; gap:4px; transform:translate(-50%, -100%); cursor:pointer;">
            <span style="font-size:11px;">📦</span>
            <span>D${String(idx + 1).padStart(2, "0")} (${demand}u)</span>
          </div>
        `;

        const popupHtml = `
          <div style="background:#090d16; color:#ffffff; padding:8px 12px; font-family:sans-serif; font-size:11px; border:1.5px solid #38bdf8; border-radius:6px; box-shadow:0 0 16px rgba(0,0,0,0.8); max-width:230px;">
            <div style="font-weight:900; color:#38bdf8; font-size:12px; display:flex; align-items:center; justify-between;">
              <span>📦 STOP D${String(idx + 1).padStart(2, "0")} (${dp.id})</span>
            </div>
            <div style="font-size:11px; color:#f1f5f9; font-weight:bold; margin-top:3px;">
              ${name}
            </div>
            <div style="color:#94a3b8; font-size:10px; font-family:monospace; margin-top:5px; border-top:1px solid #1e293b; padding-top:4px; display:flex; justify-between;">
              <span>Demand: <b style="color:#38bdf8;">${demand} units</b></span>
              <span>Node: <b style="color:#cbd5e1;">${dp.node_id ? dp.node_id.slice(0, 8) + '...' : 'Snapped'}</b></span>
            </div>
          </div>
        `;

        const popup = new maplibregl.Popup({ offset: 15, closeButton: false }).setHTML(popupHtml);

        const m = new maplibregl.Marker({ element: el })
          .setLngLat([lng, lat])
          .setPopup(popup)
          .addTo(map);
        deliveryMarkersRef.current.push(m);
      });

      // Fit map bounds to show all delivery points and central depot cleanly
      if (allLngs.length > 0 && allLats.length > 0) {
        const minLng = Math.min(...allLngs), maxLng = Math.max(...allLngs);
        const minLat = Math.min(...allLats), maxLat = Math.max(...allLats);
        if (minLng < maxLng && minLat < maxLat) {
          map.fitBounds([[minLng, minLat], [maxLng, maxLat]], { padding: 90, maxZoom: 15, duration: 800 });
        }
      }
    }
  }, [deliveryPoints, depot, isMapLoaded]);

  // ── 4e. Render Vehicle Markers with Dynamic Status Badges ──────────────
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !isMapLoaded) return;

    vehicleMarkersRef.current.forEach((m) => m.remove());
    vehicleMarkersRef.current = [];

    if (vrpRoutes && vrpRoutes.length > 0 && currentStep && currentStep >= 4) {
      vrpRoutes.forEach((vr) => {
        const coords = vr.geometry?.coordinates || [];
        if (coords.length === 0) return;

        let posIndex = Math.floor(coords.length * 0.35);
        if (currentStep >= 5) {
          if (incident && vr.vehicle_id === incident.affected_vehicle_id) {
            posIndex = Math.max(0, Math.floor(coords.length * 0.45));
          }
        }
        const [vLng, vLat] = coords[posIndex] || coords[0];

        let statusText = "EN ROUTE";
        let statusBg = "#0284c7";
        let statusColor = "#ffffff";
        let borderColor = vr.color || "#00f0ff";
        let pulseStyle = "";

        if (incident && vr.vehicle_id === incident.affected_vehicle_id && currentStep >= 5 && currentStep < 8) {
          statusText = "⚠️ AFFECTED";
          statusBg = "#dc2626";
          statusColor = "#ffffff";
          borderColor = "#ef4444";
          pulseStyle = "animation: pulse 1s infinite;";
        } else if (currentStep === 8 && rerouteResult && vr.vehicle_id === rerouteResult.affected_vehicle_id) {
          statusText = "✅ REROUTED";
          statusBg = "#059669";
          statusColor = "#ffffff";
          borderColor = "#10b981";
        }

        const el = document.createElement("div");
        el.className = "qflow-vehicle-marker";
        el.innerHTML = `
          <div style="background:#090d16; color:#ffffff; font-weight:800; font-family:monospace; font-size:11px; padding:4px 8px; border-radius:6px; border:2px solid ${borderColor}; box-shadow:0 0 14px ${borderColor}; display:flex; flex-direction:column; align-items:center; gap:2px; transform:translate(-50%, -100%); cursor:pointer; ${pulseStyle}">
            <div style="display:flex; align-items:center; gap:4px;">
              <span>🚚</span>
              <span style="color:${vr.color || "#00f0ff"};">${vr.vehicle_id.toUpperCase()}</span>
            </div>
            <div style="background:${statusBg}; color:${statusColor}; font-size:9px; font-weight:900; padding:1px 5px; border-radius:3px; text-transform:uppercase;">
              ${statusText}
            </div>
          </div>
        `;
        const m = new maplibregl.Marker({ element: el })
          .setLngLat([vLng, vLat])
          .addTo(map);
        vehicleMarkersRef.current.push(m);
      });
    }
  }, [vrpRoutes, currentStep, incident, rerouteResult, isMapLoaded]);

  // ── 4f. Render Incident Marker & Road Blockage Visual ──────────────────
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !isMapLoaded) return;

    if (incident && currentStep && currentStep >= 5) {
      const iLat = incident.latitude || 21.2514;
      const iLng = incident.longitude || 81.6296;

      if (!incidentMarkerRef.current) {
        const el = document.createElement("div");
        el.className = "qflow-incident-marker";
        el.innerHTML = `
          <div style="background:#7f1d1d; color:#fca5a5; font-weight:900; font-family:monospace; font-size:11px; padding:6px 10px; border-radius:6px; border:2.5px solid #ef4444; box-shadow:0 0 24px #ef4444; display:flex; flex-direction:column; align-items:center; gap:2px; transform:translate(-50%, -100%); cursor:pointer;">
            <div style="display:flex; align-items:center; gap:4px; font-size:12px; color:#ffffff;">
              <span>🚨</span>
              <span>SIMULATED INCIDENT</span>
            </div>
            <div style="font-size:9px; color:#fecaca; font-weight:700;">
              ${incident.road_name || "GE Road Segment"} [BLOCKED]
            </div>
          </div>
        `;
        incidentMarkerRef.current = new maplibregl.Marker({ element: el })
          .setLngLat([iLng, iLat])
          .addTo(map);
      } else {
        incidentMarkerRef.current.setLngLat([iLng, iLat]);
      }
    } else {
      if (incidentMarkerRef.current) {
        incidentMarkerRef.current.remove();
        incidentMarkerRef.current = null;
      }
    }
  }, [incident, currentStep, isMapLoaded]);

  // ── 4g. Render Old Route vs New Bypass Route for Step 8 ─────────────────
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !isMapLoaded) return;

    const OLD_SRC_ID = "qflow-old-route-src";
    const OLD_LAYER_ID = "qflow-old-route-layer";

    if (currentStep === 8 && rerouteResult && rerouteResult.original_route?.geometry) {
      const origGeom = rerouteResult.original_route.geometry;

      if (!map.getSource(OLD_SRC_ID)) {
        map.addSource(OLD_SRC_ID, {
          type: "geojson",
          data: { type: "FeatureCollection", features: [{ type: "Feature", geometry: origGeom, properties: {} }] },
        });
      } else {
        (map.getSource(OLD_SRC_ID) as maplibregl.GeoJSONSource).setData({
          type: "FeatureCollection",
          features: [{ type: "Feature", geometry: origGeom, properties: {} }],
        });
      }

      if (!map.getLayer(OLD_LAYER_ID)) {
        map.addLayer({
          id: OLD_LAYER_ID,
          type: "line",
          source: OLD_SRC_ID,
          paint: {
            "line-color": "#ef4444",
            "line-width": 5,
            "line-dasharray": [2, 2],
            "line-opacity": 0.75,
          },
        });
        map.moveLayer(OLD_LAYER_ID);
      }
    } else {
      if (map.getLayer(OLD_LAYER_ID)) {
        map.removeLayer(OLD_LAYER_ID);
      }
      if (map.getSource(OLD_SRC_ID)) {
        map.removeSource(OLD_SRC_ID);
      }
    }
  }, [currentStep, rerouteResult, isMapLoaded]);

  // ── 5. Layer Visibility ───────────────────────────────────────────────────
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !isMapLoaded) return;

    if (map.getLayer("osm-basemap-layer")) {
      map.setLayoutProperty("osm-basemap-layer", "visibility", layerVisibility.basemap ? "visible" : "none");
    }

    const netVis = layerVisibility.roadNetwork ? "visible" : "none";
    ["edges-casing", "edges-debug", "edges-primary", "edges-secondary", "edges-local", "edges-click-target"].forEach((id) => {
      if (map.getLayer(id)) map.setLayoutProperty(id, "visibility", netVis);
    });

    if (map.getLayer("nodes-layer")) {
      map.setLayoutProperty("nodes-layer", "visibility", layerVisibility.nodes ? "visible" : "none");
    }

    const routeVis = layerVisibility.route ? "visible" : "none";
    [ROUTE_LAYER_CASING, ROUTE_LAYER_GLOW, ROUTE_LAYER_LINE, ROUTE_LAYER_ARROWS].forEach((id) => {
      if (map.getLayer(id)) map.setLayoutProperty(id, "visibility", routeVis);
    });
  }, [layerVisibility, isMapLoaded]);

  // ── Map Control Handlers ──────────────────────────────────────────────────
  const handleZoomIn = () => mapRef.current?.zoomIn();
  const handleZoomOut = () => mapRef.current?.zoomOut();
  const handleFitNetwork = () => {
    const map = mapRef.current;
    if (!map || nodes.length === 0) return;
    let minLng = 180, maxLng = -180, minLat = 90, maxLat = -90;
    nodes.forEach((n) => {
      if (n.lng < minLng) minLng = n.lng;
      if (n.lng > maxLng) maxLng = n.lng;
      if (n.lat < minLat) minLat = n.lat;
      if (n.lat > maxLat) maxLat = n.lat;
    });
    if (minLng < maxLng && minLat < maxLat) {
      map.fitBounds([[minLng, minLat], [maxLng, maxLat]], { padding: 40, maxZoom: 16, duration: 800 });
    }
  };

  const isNetworkUnavailable = !isLoading && isMapLoaded && edges.length === 0;

  return (
    <div className="relative w-full h-full min-h-[520px] bg-[#07090c] border border-slate-800 rounded-none overflow-hidden select-none font-sans">
      <div ref={mapContainerRef} className="w-full h-full min-h-[520px]" />

      {/* Title Badge */}
      <div className="absolute top-4 left-4 z-10 p-2.5 bg-[#090b0e]/95 border border-sky-500/40 backdrop-blur text-xs font-mono space-y-0.5 shadow-xl">
        <div className="text-sky-400 font-bold tracking-wider uppercase flex items-center">
          <Activity size={13} className="mr-1.5 text-sky-400" /> Q-FLOW NETWORK GRAPH
        </div>
        <div className="text-[10px] text-slate-300 font-sans">
          Raipur • OSM-derived • Directed Weighted Graph
        </div>
      </div>

      {/* Mode / Graph Badge */}
      <div className="absolute top-16 left-4 z-10 px-2.5 py-1.5 bg-[#090b0e]/95 border border-slate-800 backdrop-blur text-[11px] font-mono flex items-center space-x-3 shadow-lg">
        <span className="text-slate-400 font-bold uppercase">MODE:</span>
        <span className={mapMode === "ROUTE" ? "text-amber-400 font-bold" : "text-sky-400 font-bold"}>
          {mapMode === "ROUTE" ? "🔀 TEST ROUTE (CLICK MAP)" : "🌐 NETWORK GRAPH"}
        </span>
        <span className="text-slate-600">|</span>
        <span className="text-sky-400 font-bold">{nodes.length.toLocaleString()} NODES</span>
        <span className="text-slate-600">|</span>
        <span className="text-sky-400 font-bold">{edges.length.toLocaleString()} EDGES</span>
      </div>

      {/* Route Active Indicator */}
      {routeResponse && mapMode === "ROUTE" && (
        <div className="absolute top-28 left-4 z-10 px-3 py-2 bg-[#090b0e]/95 border border-cyan-500/60 backdrop-blur text-[11px] font-mono shadow-xl space-y-1">
          <div className="text-cyan-400 font-bold flex items-center space-x-1.5">
            <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
            <span>Q-FLOW ROUTE ACTIVE</span>
          </div>
          <div className="text-slate-400 text-[10px] space-y-0.5">
            <div>
              Coords:{" "}
              <span className="text-white font-bold">
                {routeResponse.geometry?.coordinates?.length ?? 0}
              </span>{" "}
              pts
            </div>
            <div>
              Dist:{" "}
              <span className="text-emerald-400 font-bold">
                {((routeResponse.distance_meters ?? routeResponse.total_distance_meters ?? 0) / 1000).toFixed(2)} km
              </span>
            </div>
            <div>
              Algo:{" "}
              <span className="text-amber-400 font-bold">
                {routeResponse.algorithm ?? "Dijkstra"}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Network Unavailable Indicator */}
      {isNetworkUnavailable && (
        <div className="absolute top-[6.5rem] left-4 z-10 px-3 py-1.5 bg-red-950/90 border border-red-500/60 text-red-400 text-xs font-mono backdrop-blur flex items-center space-x-2 shadow-lg">
          <AlertCircle size={14} className="text-red-400" />
          <span className="font-bold uppercase">Q-FLOW network layer unavailable</span>
        </div>
      )}

      {/* Basemap Unavailable Indicator */}
      {basemapUnavailable && layerVisibility.basemap && (
        <div className="absolute bottom-10 left-4 z-10 px-2.5 py-1 bg-[#0d1015]/90 border border-slate-700 text-[11px] font-mono text-slate-300 backdrop-blur flex items-center space-x-1.5 shadow-md">
          <AlertCircle size={12} className="text-amber-400" />
          <span>Basemap unavailable</span>
        </div>
      )}

      {/* Loading Overlay */}
      {isLoading && (
        <div className="absolute inset-0 bg-[#090b0e]/80 backdrop-blur-sm z-20 flex flex-col items-center justify-center space-y-3 font-mono text-xs text-sky-400">
          <Activity size={24} className="animate-spin text-sky-400" />
          <span>Loading OpenStreetMap transportation graph...</span>
        </div>
      )}

      {/* On-Map Floating Control Buttons */}
      <div className="absolute top-4 right-4 z-10 flex flex-col space-y-1.5 font-mono">
        <button onClick={handleZoomIn} title="Zoom In" className="w-8 h-8 bg-[#0d1015]/90 hover:bg-slate-800 border border-slate-700 text-slate-200 flex items-center justify-center transition-all shadow-md">
          <ZoomIn size={14} />
        </button>
        <button onClick={handleZoomOut} title="Zoom Out" className="w-8 h-8 bg-[#0d1015]/90 hover:bg-slate-800 border border-slate-700 text-slate-200 flex items-center justify-center transition-all shadow-md">
          <ZoomOut size={14} />
        </button>
        <button onClick={handleFitNetwork} title="Fit Complete Network Bounds" className="w-8 h-8 bg-[#0d1015]/90 hover:bg-slate-800 border border-slate-700 text-sky-400 flex items-center justify-center transition-all shadow-md">
          <Maximize2 size={14} />
        </button>
      </div>

      {/* OpenStreetMap Attribution Badge */}
      <div className="absolute bottom-2 right-2 z-10 px-2 py-0.5 bg-[#09090e]/90 border border-slate-800 backdrop-blur text-[10px] font-mono text-slate-400">
        &copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer" className="underline hover:text-sky-400">OpenStreetMap</a> contributors
      </div>
    </div>
  );
}
