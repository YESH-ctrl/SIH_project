import React, { useState, useEffect } from "react";
import {
  networkApi,
  RoadNetworkDTO,
  NetworkNodeDTO,
  NetworkEdgeDTO,
  NetworkStatsResponse,
  ShortestPathRouteResponse,
  NearestNodeResponse,
} from "@/services/apiClient";
import { OSMVectorNetworkMap } from "./OSMVectorNetworkMap";
import {
  Map as MapIcon,
  Layers,
  Compass,
  CornerDownRight,
  RefreshCw,
  Zap,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  Maximize2,
  MapPin,
} from "lucide-react";

type RouteState = "INITIAL" | "AFTER_SOURCE" | "AFTER_DESTINATION" | "CALCULATING" | "SUCCESS" | "FAILURE";

interface PointLocation {
  lat: number;
  lng: number;
  nodeId?: string;
  distMeters?: number;
}

export function NetworkMapPage() {
  // 1. Data State
  const [networks, setNetworks] = useState<RoadNetworkDTO[]>([]);
  const [selectedNetworkId, setSelectedNetworkId] = useState<string>("");
  const [stats, setStats] = useState<NetworkStatsResponse | null>(null);
  const [nodes, setNodes] = useState<NetworkNodeDTO[]>([]);
  const [edges, setEdges] = useState<NetworkEdgeDTO[]>([]);

  // 2. Interaction & Mode State
  const [selectedEdge, setSelectedEdge] = useState<NetworkEdgeDTO | null>(null);
  const [selectedNode, setSelectedNode] = useState<NetworkNodeDTO | null>(null);
  const [mapMode, setMapMode] = useState<"NETWORK" | "ROUTE">("NETWORK");

  // 3. Layer Visibility State
  const [layerVisibility, setLayerVisibility] = useState({
    basemap: true,
    roadNetwork: true,
    nodes: true,
    route: true,
    labels: true,
  });

  // 4. Source A -> Destination B Route Test State
  const [routeState, setRouteState] = useState<RouteState>("INITIAL");
  const [sourcePoint, setSourcePoint] = useState<PointLocation | null>(null);
  const [targetPoint, setTargetPoint] = useState<PointLocation | null>(null);
  const [isSnapping, setIsSnapping] = useState<boolean>(false);
  const [routeResponse, setRouteResponse] = useState<ShortestPathRouteResponse | null>(null);
  const [routeError, setRouteError] = useState<string | null>(null);
  const [fitTrigger, setFitTrigger] = useState<number>(0);

  // 5. Loading & Error State
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch available networks on initial mount
  useEffect(() => {
    loadNetworks();
  }, []);

  const loadNetworks = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const list = await networkApi.getNetworks();
      setNetworks(list);

      if (list && list.length > 0) {
        // Default to Raipur Live OSM Road Network if present
        const defaultNet = list.find((n) => n.name.includes("Raipur Live")) || list.find((n) => n.name.includes("Raipur")) || list[0];
        setSelectedNetworkId(defaultNet.id);
      } else {
        setIsLoading(false);
      }
    } catch (err: any) {
      console.error("[NetworkMapPage] Failed to fetch road networks:", err);
      setError("Unable to connect to Q-FLOW network backend service.");
      setIsLoading(false);
    }
  };

  // Fetch details when selectedNetworkId changes
  useEffect(() => {
    if (!selectedNetworkId) return;

    loadNetworkDetails(selectedNetworkId);
  }, [selectedNetworkId]);

  const loadNetworkDetails = async (netId: string) => {
    setIsLoading(true);
    setError(null);
    setSelectedEdge(null);
    setSelectedNode(null);
    handleClearRoute();

    try {
      const [statsData, nodesData, edgesData] = await Promise.all([
        networkApi.getNetworkStats(netId),
        networkApi.getNetworkNodes(netId, 1, 50000),
        networkApi.getNetworkEdges(netId, 1, 50000),
      ]);

      setStats(statsData);
      setNodes(nodesData);
      setEdges(edgesData);
    } catch (err: any) {
      console.error(`[NetworkMapPage] Failed to load network '${netId}':`, err);
      setError(`Failed to load transportation graph for network ${netId}.`);
    } finally {
      setIsLoading(false);
    }
  };

  // Handle Map Clicks in TEST ROUTE Mode
  const handleMapClick = async (lat: number, lng: number) => {
    if (mapMode !== "ROUTE" || isSnapping) return;

    // Do NOT accept a 3rd click until Clear is pressed
    if (routeState === "AFTER_DESTINATION" || routeState === "SUCCESS" || routeState === "CALCULATING") {
      return;
    }

    if (!selectedNetworkId) return;

    setIsSnapping(true);
    setRouteError(null);

    try {
      // Call backend to snap click to nearest network node belonging to selected network
      const nearest: NearestNodeResponse = await networkApi.getNearestNode(selectedNetworkId, lat, lng);

      if (routeState === "INITIAL" || !sourcePoint) {
        // 1st Map Click -> Set Source (A 🟢)
        setSourcePoint({
          lat: nearest.latitude,
          lng: nearest.longitude,
          nodeId: nearest.node_id,
          distMeters: nearest.distance_meters,
        });
        setRouteState("AFTER_SOURCE");
      } else if (routeState === "AFTER_SOURCE" && !targetPoint) {
        // 2nd Map Click -> Set Destination (B 🔴)
        setTargetPoint({
          lat: nearest.latitude,
          lng: nearest.longitude,
          nodeId: nearest.node_id,
          distMeters: nearest.distance_meters,
        });
        setRouteState("AFTER_DESTINATION");
      }
    } catch (err: any) {
      console.error("[NetworkMapPage] Failed to snap map click to nearest node:", err);
      setRouteError("Failed to snap click to network node. Please try another location.");
    } finally {
      setIsSnapping(false);
    }
  };

  // Calculate Dijkstra Shortest Path Route
  const handleCalculateRoute = async () => {
    if (!selectedNetworkId || !sourcePoint?.nodeId || !targetPoint?.nodeId) return;

    setRouteState("CALCULATING");
    setRouteError(null);

    try {
      const res = await networkApi.calculateRoute(selectedNetworkId, {
        source_node_id: sourcePoint.nodeId,
        target_node_id: targetPoint.nodeId,
      });

      // ── DEBUG: Log full routeResponse to browser console ──
      console.log("[NetworkMapPage] ✅ Route calculation SUCCESS:", {
        network_id: res.network_id,
        node_count: res.node_count,
        edge_count: res.edge_count,
        distance_meters: res.distance_meters,
        travel_time_seconds: res.travel_time_seconds,
        algorithm: res.algorithm,
        geometry_type: res.geometry?.type,
        geometry_coords_count: res.geometry?.coordinates?.length,
        geometry_first_coord: res.geometry?.coordinates?.[0],
        geometry_last_coord: res.geometry?.coordinates?.[res.geometry?.coordinates?.length - 1],
        path_coordinates_count: res.path_coordinates?.length,
        node_ids_count: res.node_ids?.length,
      });

      setRouteResponse(res);
      setRouteState("SUCCESS");
    } catch (err: any) {
      console.error("[NetworkMapPage] Route calculation failed:", err);
      const errMsg = err?.message || "No valid route found between source and destination.";
      setRouteError(errMsg);
      setRouteState("FAILURE");
    }
  };

  // Clear Route Test State
  const handleClearRoute = () => {
    setRouteState("INITIAL");
    setSourcePoint(null);
    setTargetPoint(null);
    setRouteResponse(null);
    setRouteError(null);
  };

  // Pre-fill known test route nodes (Section 24 regression test)
  const handleSelectKnownRoute = () => {
    if (nodes.length < 2) return;
    const knownSrc = nodes.find((n) => n.id === "14efdb65-d4ef-58f2-be61-02ac26a9ee11") || nodes[0];
    const knownTgt =
      nodes.find((n) => n.id === "a71e506d-3ef5-5bd8-b0ee-86250f5b3045") ||
      nodes[Math.min(30, nodes.length - 1)];

    setSourcePoint({
      lat: knownSrc.lat,
      lng: knownSrc.lng,
      nodeId: knownSrc.id,
      distMeters: 0,
    });
    setTargetPoint({
      lat: knownTgt.lat,
      lng: knownTgt.lng,
      nodeId: knownTgt.id,
      distMeters: 0,
    });
    setRouteState("AFTER_DESTINATION");
    setRouteError(null);
  };

  // Fit Map to Route Bounds
  const handleFitRoute = () => {
    if (!routeResponse) return;
    // Increment fitTrigger to notify map to re-fit
    setFitTrigger((n) => n + 1);
  };

  const selectedNetwork = networks.find((n) => n.id === selectedNetworkId);

  return (
    <div className="space-y-4 font-sans text-white">
      {/* Top Header & Network Selector Bar */}
      <div className="pb-3 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold font-mono text-white tracking-tight uppercase flex items-center">
            <MapIcon size={20} className="mr-2 text-sky-400" /> TRANSPORTATION NETWORK MODEL
          </h1>
          <p className="text-xs text-slate-400 font-sans mt-0.5">
            OpenStreetMap directed weighted graph & Source A → B shortest-path routing service.
          </p>
        </div>

        {/* Network Selection Dropdown */}
        <div className="flex items-center space-x-2 font-mono text-xs">
          <span className="text-slate-400 font-bold uppercase">NETWORK:</span>
          <select
            value={selectedNetworkId}
            onChange={(e) => setSelectedNetworkId(e.target.value)}
            disabled={isLoading || networks.length === 0}
            className="px-3 py-1.5 bg-[#0d1015] border border-slate-700 text-white font-mono text-xs font-semibold focus:outline-none focus:border-sky-400 cursor-pointer min-w-[260px]"
          >
            {networks.length === 0 ? (
              <option value="">No Networks Available</option>
            ) : (
              networks.map((net) => (
                <option key={net.id} value={net.id}>
                  {net.name} ({net.source} {net.version})
                </option>
              ))
            )}
          </select>

          <button
            onClick={() => loadNetworkDetails(selectedNetworkId)}
            disabled={isLoading || !selectedNetworkId}
            title="Reload Network Data"
            className="p-1.5 bg-[#0d1015] border border-slate-700 hover:border-slate-500 text-slate-300 transition-all"
          >
            <RefreshCw size={14} className={isLoading ? "animate-spin text-sky-400" : ""} />
          </button>
        </div>
      </div>

      {/* Map Control & Mode Bar */}
      <div className="p-2.5 bg-[#0d1015] border border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs font-mono">
        {/* Map Mode Selector */}
        <div className="flex items-center space-x-2">
          <span className="text-slate-400 text-[11px] mr-1 uppercase flex items-center font-bold">
            <Compass size={12} className="mr-1 text-sky-400" /> MODE:
          </span>
          <button
            onClick={() => {
              setMapMode("NETWORK");
              handleClearRoute();
            }}
            className={`px-3 py-1 text-[11px] uppercase font-bold border transition-all ${
              mapMode === "NETWORK"
                ? "bg-sky-500/20 text-sky-400 border-sky-500/60"
                : "bg-slate-900 text-slate-400 border-slate-800 hover:text-white"
            }`}
          >
            🌐 NETWORK GRAPH
          </button>
          <button
            onClick={() => setMapMode("ROUTE")}
            className={`px-3 py-1 text-[11px] uppercase font-bold border transition-all ${
              mapMode === "ROUTE"
                ? "bg-amber-500/20 text-amber-400 border-amber-500/60"
                : "bg-slate-900 text-slate-400 border-slate-800 hover:text-white"
            }`}
          >
            🔀 TEST ROUTE
          </button>
        </div>

        {/* Layer Visibility Checkboxes */}
        <div className="flex items-center space-x-3 text-[11px]">
          <span className="text-slate-400 uppercase font-bold flex items-center">
            <Layers size={12} className="mr-1 text-slate-400" /> LAYERS:
          </span>

          <label className="flex items-center space-x-1.5 cursor-pointer text-slate-300 hover:text-white">
            <input
              type="checkbox"
              checked={layerVisibility.basemap}
              onChange={(e) =>
                setLayerVisibility((prev) => ({ ...prev, basemap: e.target.checked }))
              }
              className="accent-sky-400"
            />
            <span>Basemap</span>
          </label>

          <label className="flex items-center space-x-1.5 cursor-pointer text-slate-300 hover:text-white">
            <input
              type="checkbox"
              checked={layerVisibility.roadNetwork}
              onChange={(e) =>
                setLayerVisibility((prev) => ({ ...prev, roadNetwork: e.target.checked }))
              }
              className="accent-sky-400"
            />
            <span>Road Network</span>
          </label>

          <label className="flex items-center space-x-1.5 cursor-pointer text-slate-300 hover:text-white">
            <input
              type="checkbox"
              checked={layerVisibility.nodes}
              onChange={(e) => setLayerVisibility((prev) => ({ ...prev, nodes: e.target.checked }))}
              className="accent-sky-400"
            />
            <span>Nodes</span>
          </label>

          <label className="flex items-center space-x-1.5 cursor-pointer text-slate-300 hover:text-white">
            <input
              type="checkbox"
              checked={layerVisibility.route}
              onChange={(e) => setLayerVisibility((prev) => ({ ...prev, route: e.target.checked }))}
              className="accent-cyan-400"
            />
            <span>Route Path</span>
          </label>
        </div>
      </div>

      {/* Main Grid: Map (8 cols) & Route Tester / Inspector Panel (4 cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 min-h-[580px]">
        {/* Left Column: Interactive Vector Map */}
        <div className="lg:col-span-8 h-full flex flex-col space-y-3">
          {error ? (
            <div className="p-8 bg-[#0d1015] border border-red-500/40 text-center font-mono space-y-3 my-auto">
              <AlertTriangle size={36} className="text-red-400 mx-auto" />
              <h2 className="text-base font-bold text-white uppercase">NETWORK LOAD FAILURE</h2>
              <p className="text-xs font-sans text-slate-400">{error}</p>
              <button
                onClick={() => selectedNetworkId && loadNetworkDetails(selectedNetworkId)}
                className="px-4 py-1.5 bg-red-500/20 border border-red-500/60 text-red-400 hover:bg-red-500/30 text-xs uppercase font-bold"
              >
                Retry Connection
              </button>
            </div>
          ) : (
            <div className="relative flex-1 min-h-[520px]">
              <OSMVectorNetworkMap
                nodes={nodes}
                edges={edges}
                selectedEdge={selectedEdge}
                selectedNode={selectedNode}
                routeResponse={mapMode === "ROUTE" ? routeResponse : null}
                mapMode={mapMode}
                sourcePoint={sourcePoint}
                targetPoint={targetPoint}
                layerVisibility={layerVisibility}
                fitTrigger={fitTrigger}
                onSelectEdge={(edge) => setSelectedEdge(edge)}
                onSelectNode={(node) => setSelectedNode(node)}
                onMapClick={handleMapClick}
                isLoading={isLoading}
              />

              {/* Map Legend Overlay */}
              <div className="absolute bottom-3 left-3 p-3 bg-[#090b0e]/95 border border-slate-800 backdrop-blur text-[10px] font-mono space-y-2 z-10 shadow-xl max-w-sm">
                <div>
                  <div className="text-sky-400 font-bold uppercase tracking-wider border-b border-slate-800 pb-1 flex items-center">
                    <span className="w-2 h-2 rounded-full bg-sky-400 mr-1.5" /> Q-FLOW NETWORK LEGEND
                  </div>
                  <div className="grid grid-cols-2 gap-x-3 gap-y-1 mt-1.5 text-slate-300">
                    <span className="flex items-center">
                      <span className="w-3.5 h-1 bg-[#00f0ff] mr-1.5 rounded-full" /> Primary Highway
                    </span>
                    <span className="flex items-center">
                      <span className="w-3.5 h-1 bg-[#a855f7] mr-1.5 rounded-full" /> Secondary Arterial
                    </span>
                    <span className="flex items-center">
                      <span className="w-3.5 h-1 bg-[#38bdf8] mr-1.5 rounded-full" /> Local Street
                    </span>
                    <span className="flex items-center">
                      <span className="w-2 h-2 rounded-full bg-[#00f0ff] ring-1 ring-[#030712] mr-1.5" /> Intersection Node
                    </span>
                    {mapMode === "ROUTE" && (
                      <>
                        <span className="flex items-center text-emerald-400 font-bold col-span-2">
                          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 mr-1.5 ring-2 ring-white" /> Source A (🟢 Map Click)
                        </span>
                        <span className="flex items-center text-red-400 font-bold col-span-2">
                          <span className="w-2.5 h-2.5 rounded-full bg-red-500 mr-1.5 ring-2 ring-white" /> Destination B (🔴 Map Click)
                        </span>
                      </>
                    )}
                    {routeResponse && (
                      <span className="flex items-center text-cyan-400 font-bold col-span-2">
                        <span className="w-4 h-1.5 bg-[#00f0ff] shadow-[0_0_10px_#00f0ff] mr-1.5" /> Q-FLOW Shortest Path Route
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Right Column: Route Tester / Overview / Results (4 cols) */}
        <div className="lg:col-span-4 space-y-4 font-mono">
          {/* TEST ROUTE Mode Panel */}
          {mapMode === "ROUTE" ? (
            <div className="bg-[#0d1015] border border-amber-500/50 p-4 font-mono text-xs space-y-4">
              <div className="border-b border-slate-800 pb-2 flex items-center justify-between">
                <span className="font-bold text-amber-400 uppercase tracking-wider flex items-center">
                  <Zap size={15} className="mr-1.5 text-amber-400" /> ROUTE TEST WORKFLOW
                </span>
                <span className="text-[10px] px-2 py-0.5 bg-amber-500/10 border border-amber-500/30 text-amber-400 font-bold">
                  DIJKSTRA
                </span>
              </div>

              {/* ROUTE STATE INDICATOR */}
              <div className="p-2.5 bg-slate-900 border border-slate-800 space-y-1">
                <div className="text-[10px] text-slate-400 uppercase">CURRENT STATE:</div>
                <div className="font-bold text-xs flex items-center">
                  {routeState === "INITIAL" && (
                    <span className="text-sky-400 flex items-center">
                      <MapPin size={13} className="mr-1.5 text-sky-400 animate-bounce" /> INITIAL: Click map to select Source (A)
                    </span>
                  )}
                  {routeState === "AFTER_SOURCE" && (
                    <span className="text-emerald-400 flex items-center">
                      <CheckCircle2 size={13} className="mr-1.5 text-emerald-400" /> Source selected. Click map for Destination (B)
                    </span>
                  )}
                  {routeState === "AFTER_DESTINATION" && (
                    <span className="text-amber-400 flex items-center">
                      <Zap size={13} className="mr-1.5 text-amber-400" /> Destination selected. Ready to calculate!
                    </span>
                  )}
                  {routeState === "CALCULATING" && (
                    <span className="text-amber-400 flex items-center">
                      <RefreshCw size={13} className="mr-1.5 animate-spin text-amber-400" /> Calculating shortest path...
                    </span>
                  )}
                  {routeState === "SUCCESS" && (
                    <span className="text-emerald-400 flex items-center">
                      <CheckCircle2 size={13} className="mr-1.5 text-emerald-400" />
                      {(routeResponse?.geometry?.coordinates?.length || routeResponse?.path_coordinates?.length || 0) >= 2
                        ? "● ROUTE FOUND"
                        : "ROUTE CALCULATED | ROUTE VISUALIZATION ERROR"}
                    </span>
                  )}
                  {routeState === "FAILURE" && (
                    <span className="text-red-400 flex items-center">
                      <AlertTriangle size={13} className="mr-1.5 text-red-400" /> No route found
                    </span>
                  )}
                </div>
              </div>

              {/* SOURCE POINT STATUS */}
              <div className="p-3 bg-slate-900 border border-slate-800 space-y-1">
                <div className="flex items-center justify-between text-[10px] uppercase font-bold text-emerald-400">
                  <span className="flex items-center">🟢 SOURCE (A)</span>
                  <span>{sourcePoint ? "SNAPPED TO GRAPH" : "AWAITING CLICK"}</span>
                </div>
                {sourcePoint ? (
                  <div className="space-y-0.5 text-[11px]">
                    <div className="text-white font-bold truncate">Node ID: {sourcePoint.nodeId}</div>
                    <div className="text-slate-400 text-[10px]">
                      Coords: ({sourcePoint.lat.toFixed(6)}, {sourcePoint.lng.toFixed(6)})
                    </div>
                    {sourcePoint.distMeters !== undefined && (
                      <div className="text-slate-500 text-[9.5px]">
                        Snapped offset: {sourcePoint.distMeters.toFixed(1)} m
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-slate-500 text-[11px] italic">Click map to select source coordinate</div>
                )}
              </div>

              {/* DESTINATION POINT STATUS */}
              <div className="p-3 bg-slate-900 border border-slate-800 space-y-1">
                <div className="flex items-center justify-between text-[10px] uppercase font-bold text-red-400">
                  <span className="flex items-center">🔴 DESTINATION (B)</span>
                  <span>{targetPoint ? "SNAPPED TO GRAPH" : "AWAITING CLICK"}</span>
                </div>
                {targetPoint ? (
                  <div className="space-y-0.5 text-[11px]">
                    <div className="text-white font-bold truncate">Node ID: {targetPoint.nodeId}</div>
                    <div className="text-slate-400 text-[10px]">
                      Coords: ({targetPoint.lat.toFixed(6)}, {targetPoint.lng.toFixed(6)})
                    </div>
                    {targetPoint.distMeters !== undefined && (
                      <div className="text-slate-500 text-[9.5px]">
                        Snapped offset: {targetPoint.distMeters.toFixed(1)} m
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-slate-500 text-[11px] italic">Click map to select destination coordinate</div>
                )}
              </div>

              {/* PRESET SHORTCUT */}
              {(!sourcePoint || !targetPoint) && (
                <button
                  onClick={handleSelectKnownRoute}
                  disabled={nodes.length < 2}
                  className="w-full py-1.5 px-2 bg-sky-500/10 border border-sky-500/30 hover:border-sky-400 text-sky-400 text-[10.5px] font-mono font-bold uppercase transition-all flex items-center justify-center space-x-1"
                >
                  <MapPin size={12} className="mr-1" />
                  <span>SELECT KNOWN TEST ROUTE (A → B)</span>
                </button>
              )}

              {/* ACTION BUTTONS */}
              <div className="grid grid-cols-2 gap-2 pt-1">
                <button
                  onClick={handleCalculateRoute}
                  disabled={
                    routeState === "CALCULATING" ||
                    !sourcePoint?.nodeId ||
                    !targetPoint?.nodeId
                  }
                  className="py-2 px-3 bg-amber-500/20 border border-amber-500/60 hover:bg-amber-500/30 text-amber-400 font-bold uppercase text-[11px] transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                >
                  {routeState === "CALCULATING" ? (
                    <>
                      <RefreshCw size={13} className="mr-1.5 animate-spin" /> CALCULATING...
                    </>
                  ) : (
                    <>
                      <Zap size={13} className="mr-1.5" /> CALCULATE ROUTE
                    </>
                  )}
                </button>

                <button
                  onClick={handleClearRoute}
                  className="py-2 px-3 bg-slate-900 border border-slate-700 hover:border-slate-500 text-slate-300 font-bold uppercase text-[11px] transition-all flex items-center justify-center"
                >
                  <RotateCcw size={13} className="mr-1.5 text-slate-400" /> CLEAR
                </button>
              </div>

              {/* ERROR DISPLAY */}
              {routeError && (
                <div className="p-3 bg-red-950/80 border border-red-500/60 text-red-400 text-[11px] space-y-1">
                  <div className="font-bold flex items-center">
                    <AlertTriangle size={13} className="mr-1 text-red-400" /> ROUTING ERROR
                  </div>
                  <div>{routeError}</div>
                </div>
              )}

              {/* ROUTE RESULT PANEL (Non-Hardcoded Specifications) */}
              {routeResponse && routeState === "SUCCESS" && (
                <div className="p-4 bg-slate-900 border border-cyan-500/60 space-y-3 shadow-xl">
                  <div className="border-b border-slate-800 pb-2 flex items-center justify-between">
                    <span className="font-bold text-cyan-400 uppercase text-xs tracking-wider">
                      Q-FLOW ROUTE RESULT
                    </span>
                    <span className="text-emerald-400 font-bold text-[10px] flex items-center">
                      <CheckCircle2 size={12} className="mr-1" />
                      {(routeResponse?.geometry?.coordinates?.length || routeResponse?.path_coordinates?.length || 0) >= 2
                        ? "● ROUTE FOUND"
                        : "ROUTE CALCULATED | VISUALIZATION ERROR"}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-center text-[11px]">
                    <div className="p-2.5 bg-[#090b0e] border border-slate-800">
                      <span className="text-slate-400 block text-[9px] uppercase">DISTANCE</span>
                      <span className="font-bold text-white text-base">
                        {(routeResponse.distance_meters || routeResponse.total_distance_meters || 0) > 1000
                          ? `${(
                              (routeResponse.distance_meters || routeResponse.total_distance_meters || 0) / 1000
                            ).toFixed(2)} km`
                          : `${(routeResponse.distance_meters || routeResponse.total_distance_meters || 0).toFixed(0)} m`}
                      </span>
                    </div>

                    <div className="p-2.5 bg-[#090b0e] border border-slate-800">
                      <span className="text-slate-400 block text-[9px] uppercase">FREE-FLOW TRAVEL TIME</span>
                      <span className="font-bold text-emerald-400 text-base">
                        {((routeResponse.travel_time_seconds || routeResponse.total_travel_time_seconds || 0) / 60).toFixed(2)} min
                      </span>
                    </div>

                    <div className="p-2.5 bg-[#090b0e] border border-slate-800">
                      <span className="text-slate-400 block text-[9px] uppercase">NODES</span>
                      <span className="font-bold text-sky-400 text-sm">
                        {routeResponse.node_count || routeResponse.node_ids?.length || 0} Nodes
                      </span>
                    </div>

                    <div className="p-2.5 bg-[#090b0e] border border-slate-800">
                      <span className="text-slate-400 block text-[9px] uppercase">EDGES</span>
                      <span className="font-bold text-amber-400 text-sm">
                        {routeResponse.edge_count || routeResponse.edge_ids?.length || 0} Edges
                      </span>
                    </div>
                  </div>

                  <div className="space-y-1 text-[10px] border-t border-slate-800 pt-2 text-slate-300">
                    <div className="flex justify-between">
                      <span className="text-slate-500 uppercase">ALGORITHM:</span>
                      <span className="font-bold text-white">Dijkstra (Static Weight)</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500 uppercase">NETWORK:</span>
                      <span className="font-bold text-sky-400 truncate max-w-[200px]">
                        {selectedNetwork?.name || "Raipur Live OSM Road Network"}
                      </span>
                    </div>
                  </div>

                  <button
                    onClick={handleFitRoute}
                    className="w-full py-1.5 bg-cyan-500/20 border border-cyan-500/50 hover:bg-cyan-500/30 text-cyan-400 font-bold uppercase text-[10px] transition-all flex items-center justify-center"
                  >
                    <Maximize2 size={12} className="mr-1.5" /> FIT MAP TO ROUTE
                  </button>
                </div>
              )}
            </div>
          ) : (
            /* NETWORK OVERVIEW PANEL (when in NETWORK mode) */
            <div className="bg-[#0d1015] border border-slate-800 p-4 font-mono text-xs space-y-4">
              <div className="border-b border-slate-800 pb-2 flex items-center justify-between">
                <span className="font-bold text-white uppercase tracking-wider">NETWORK OVERVIEW</span>
                <span className="flex items-center text-[10px] text-emerald-400 font-bold">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 mr-1 animate-pulse" /> ACTIVE
                </span>
              </div>

              {stats ? (
                <div className="space-y-3">
                  <div className="text-sm font-bold text-sky-400">{stats.name}</div>

                  <div className="grid grid-cols-2 gap-2 text-center">
                    <div className="p-3 bg-slate-900 border border-slate-800">
                      <div className="text-xl font-bold text-white">{stats.node_count.toLocaleString()}</div>
                      <div className="text-[10px] text-slate-400 uppercase mt-0.5">NODES</div>
                    </div>

                    <div className="p-3 bg-slate-900 border border-slate-800">
                      <div className="text-xl font-bold text-white">{stats.edge_count.toLocaleString()}</div>
                      <div className="text-[10px] text-slate-400 uppercase mt-0.5">EDGES</div>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-2 text-center text-[10px]">
                    <div className="p-2 bg-slate-900 border border-slate-800">
                      <span className="text-slate-400 block uppercase">AVG LENGTH</span>
                      <span className="font-bold text-emerald-400 text-xs">{stats.avg_length_meters.toFixed(1)} m</span>
                    </div>

                    <div className="p-2 bg-slate-900 border border-slate-800">
                      <span className="text-slate-400 block uppercase">AVG SPEED</span>
                      <span className="font-bold text-sky-400 text-xs">{stats.avg_speed_kph.toFixed(1)} km/h</span>
                    </div>

                    <div className="p-2 bg-slate-900 border border-slate-800">
                      <span className="text-slate-400 block uppercase">AVG FREE TIME</span>
                      <span className="font-bold text-amber-400 text-xs">{stats.avg_travel_time_seconds.toFixed(1)} s</span>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-slate-500 text-center py-6">Select a network to view graph telemetry</div>
              )}

              <div className="pt-2 border-t border-slate-800">
                <button
                  onClick={() => setMapMode("ROUTE")}
                  className="w-full py-2 bg-amber-500/20 border border-amber-500/60 hover:bg-amber-500/30 text-amber-400 font-bold uppercase text-[11px] transition-all flex items-center justify-center"
                >
                  <Zap size={14} className="mr-1.5" /> START A → B ROUTE TEST
                </button>
              </div>
            </div>
          )}

          {/* INSPECTOR PANEL (when Edge or Node selected) */}
          {selectedEdge ? (
            <div className="bg-[#0d1015] border border-sky-500/50 p-4 text-xs space-y-3">
              <div className="border-b border-slate-800 pb-2 flex justify-between items-center">
                <span className="font-bold text-sky-400 uppercase tracking-wider">SELECTED ROAD EDGE</span>
                <button
                  onClick={() => setSelectedEdge(null)}
                  className="text-[10px] text-slate-500 hover:text-white uppercase"
                >
                  [Close]
                </button>
              </div>

              <div className="p-2.5 bg-slate-900 border border-slate-800">
                <span className="text-[10px] text-slate-400 uppercase block">ROAD NAME</span>
                <div className="font-bold text-white text-sm">{selectedEdge.road_name}</div>
                <div className="text-[10px] text-slate-500 mt-0.5">Edge ID: {selectedEdge.id}</div>
              </div>

              <div className="grid grid-cols-2 gap-2 text-[11px]">
                <div className="p-2 bg-slate-900 border border-slate-800">
                  <span className="text-slate-400 block text-[9px] uppercase">ROAD TYPE</span>
                  <span className="font-bold text-sky-400 uppercase">{selectedEdge.road_type}</span>
                </div>

                <div className="p-2 bg-slate-900 border border-slate-800">
                  <span className="text-slate-400 block text-[9px] uppercase">SEGMENT LENGTH</span>
                  <span className="font-bold text-white">{selectedEdge.length_meters.toFixed(1)} m</span>
                </div>
              </div>
            </div>
          ) : selectedNode ? (
            <div className="bg-[#0d1015] border border-emerald-500/50 p-4 text-xs space-y-3">
              <div className="border-b border-slate-800 pb-2 flex justify-between items-center">
                <span className="font-bold text-emerald-400 uppercase tracking-wider">SELECTED GRAPH NODE</span>
                <button
                  onClick={() => setSelectedNode(null)}
                  className="text-[10px] text-slate-500 hover:text-white uppercase"
                >
                  [Close]
                </button>
              </div>

              <div className="p-2.5 bg-slate-900 border border-slate-800">
                <span className="text-[10px] text-slate-400 uppercase block">NODE UUID</span>
                <div className="font-bold text-white text-xs">{selectedNode.id}</div>
              </div>

              <div className="grid grid-cols-2 gap-2 text-[11px]">
                <div className="p-2 bg-slate-900 border border-slate-800">
                  <span className="text-slate-400 block text-[9px] uppercase">LATITUDE</span>
                  <span className="font-bold text-white">{selectedNode.lat.toFixed(6)}° N</span>
                </div>
                <div className="p-2 bg-slate-900 border border-slate-800">
                  <span className="text-slate-400 block text-[9px] uppercase">LONGITUDE</span>
                  <span className="font-bold text-white">{selectedNode.lng.toFixed(6)}° E</span>
                </div>
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
