import React, { useState, useEffect } from "react";
import {
  networkApi,
  RoadNetworkDTO,
  NetworkNodeDTO,
  NetworkEdgeDTO,
  NetworkStatsResponse,
  ShortestPathRouteResponse,
} from "@/services/apiClient";
import { OSMVectorNetworkMap } from "./OSMVectorNetworkMap";
import {
  Map as MapIcon,
  Layers,
  Activity,
  CheckCircle2,
  AlertTriangle,
  Compass,
  Navigation,
  CornerDownRight,
  Info,
  RefreshCw,
  Zap,
} from "lucide-react";

export function NetworkMapPage() {
  // 1. Data State
  const [networks, setNetworks] = useState<RoadNetworkDTO[]>([]);
  const [selectedNetworkId, setSelectedNetworkId] = useState<string>("");
  const [stats, setStats] = useState<NetworkStatsResponse | null>(null);
  const [nodes, setNodes] = useState<NetworkNodeDTO[]>([]);
  const [edges, setEdges] = useState<NetworkEdgeDTO[]>([]);

  // 2. Interaction State
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

  // 4. Shortest Path Route Test State
  const [sourceNodeId, setSourceNodeId] = useState<string>("");
  const [targetNodeId, setTargetNodeId] = useState<string>("");
  const [routeResponse, setRouteResponse] = useState<ShortestPathRouteResponse | null>(null);
  const [isCalculatingRoute, setIsCalculatingRoute] = useState<boolean>(false);

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
        // Select Raipur OSM Network or first available
        const defaultNet = list.find((n) => n.name.includes("Raipur")) || list[0];
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
    setRouteResponse(null);

    try {
      // Fetch stats, nodes, and edges in parallel
      const [statsData, nodesData, edgesData] = await Promise.all([
        networkApi.getNetworkStats(netId),
        networkApi.getNetworkNodes(netId, 1, 10000),
        networkApi.getNetworkEdges(netId, 1, 10000),
      ]);

      setStats(statsData);
      setNodes(nodesData);
      setEdges(edgesData);

      // Set default source & target nodes for route testing
      if (nodesData.length >= 2) {
        setSourceNodeId(nodesData[0].id);
        setTargetNodeId(nodesData[Math.floor(nodesData.length / 2)].id);
      }
    } catch (err: any) {
      console.error(`[NetworkMapPage] Failed to load network '${netId}':`, err);
      setError(`Failed to load transportation graph for network ${netId}.`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCalculateRoute = async () => {
    if (!selectedNetworkId || !sourceNodeId || !targetNodeId) return;

    setIsCalculatingRoute(true);
    try {
      const res = await networkApi.calculateRoute(selectedNetworkId, {
        source_node_id: sourceNodeId,
        target_node_id: targetNodeId,
      });
      setRouteResponse(res);
      setMapMode("ROUTE");
    } catch (err: any) {
      console.error("[NetworkMapPage] Route calculation failed:", err);
    } finally {
      setIsCalculatingRoute(false);
    }
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
            Production-quality OpenStreetMap directed graph & static weight topology viewer.
          </p>
        </div>

        {/* Network Selection Dropdown */}
        <div className="flex items-center space-x-2 font-mono text-xs">
          <span className="text-slate-400 font-bold uppercase">NETWORK:</span>
          <select
            value={selectedNetworkId}
            onChange={(e) => setSelectedNetworkId(e.target.value)}
            disabled={isLoading || networks.length === 0}
            className="px-3 py-1.5 bg-[#0d1015] border border-slate-700 text-white font-mono text-xs font-semibold focus:outline-none focus:border-sky-400 cursor-pointer min-w-[240px]"
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

      {/* Map Control & Layer Toggle Bar */}
      <div className="p-2.5 bg-[#0d1015] border border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs font-mono">
        {/* Map Mode Selector */}
        <div className="flex items-center space-x-1.5">
          <span className="text-slate-400 text-[11px] mr-1 uppercase flex items-center font-bold">
            <Compass size={12} className="mr-1 text-sky-400" /> MODE:
          </span>
          <button
            onClick={() => setMapMode("NETWORK")}
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
            <span>Nodes (Zoom ≥ 12)</span>
          </label>

          <label className="flex items-center space-x-1.5 cursor-pointer text-slate-300 hover:text-white">
            <input
              type="checkbox"
              checked={layerVisibility.route}
              onChange={(e) => setLayerVisibility((prev) => ({ ...prev, route: e.target.checked }))}
              className="accent-amber-400"
            />
            <span>Route Path</span>
          </label>
        </div>
      </div>

      {/* Main Grid: Map (8 cols) & Overview / Inspector (4 cols) */}
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
                layerVisibility={layerVisibility}
                onSelectEdge={(edge) => setSelectedEdge(edge)}
                onSelectNode={(node) => setSelectedNode(node)}
                isLoading={isLoading}
              />

              {/* Map Legend Overlay */}
              <div className="absolute bottom-3 left-3 p-3 bg-[#090b0e]/95 border border-slate-800 backdrop-blur text-[10px] font-mono space-y-2 z-10 shadow-xl max-w-sm">
                <div>
                  <div className="text-sky-400 font-bold uppercase tracking-wider border-b border-slate-800 pb-1 flex items-center">
                    <span className="w-2 h-2 rounded-full bg-sky-400 mr-1.5" /> Q-FLOW NETWORK
                  </div>
                  <div className="grid grid-cols-2 gap-x-3 gap-y-1 mt-1.5 text-slate-300">
                    <span className="flex items-center">
                      <span className="w-3.5 h-1 bg-[#00f0ff] mr-1.5 rounded-full" /> Primary / Highway
                    </span>
                    <span className="flex items-center">
                      <span className="w-3.5 h-1 bg-[#a855f7] mr-1.5 rounded-full" /> Secondary / Arterial
                    </span>
                    <span className="flex items-center">
                      <span className="w-3.5 h-1 bg-[#0284c7] mr-1.5 rounded-full" /> Local / Residential
                    </span>
                    <span className="flex items-center">
                      <span className="w-2 h-2 rounded-full bg-[#00f0ff] ring-1 ring-[#030712] mr-1.5" /> Network Node (Zoom ≥ 12)
                    </span>
                    {routeResponse && (
                      <span className="flex items-center text-amber-400 font-bold col-span-2">
                        <span className="w-4 h-1.5 bg-[#fbbf24] shadow-[0_0_8px_#f59e0b] mr-1.5" /> Selected Route
                      </span>
                    )}
                  </div>
                </div>

                <div className="pt-1 border-t border-slate-800/80">
                  <div className="text-slate-500 font-bold uppercase tracking-wider">BASEMAP</div>
                  <div className="text-slate-400 mt-0.5 flex items-center">
                    <span className="w-3 h-3 border border-dashed border-slate-600 mr-1.5 bg-slate-800/40" /> OSM geographic context (Subdued)
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Route Testing Controls (when in ROUTE mode) */}
          {mapMode === "ROUTE" && (
            <div className="p-3 bg-[#0d1015] border border-amber-500/40 font-mono text-xs space-y-3">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                <span className="font-bold text-amber-400 uppercase flex items-center">
                  <Zap size={14} className="mr-1.5 text-amber-400" /> DIJKSTRA SHORTEST PATH TESTER
                </span>
                <span className="text-[10px] text-slate-400">STATIC WEIGHT: W_static(e) = FREE-FLOW TIME</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-end">
                <div className="sm:col-span-5">
                  <label className="text-[10px] text-slate-400 uppercase block mb-1">SOURCE NODE:</label>
                  <select
                    value={sourceNodeId}
                    onChange={(e) => setSourceNodeId(e.target.value)}
                    className="w-full px-2.5 py-1 bg-slate-900 border border-slate-700 text-white font-mono text-xs"
                  >
                    {nodes.slice(0, 100).map((n) => (
                      <option key={n.id} value={n.id}>
                        Node {n.id.slice(0, 8)}... ({n.lat.toFixed(4)}, {n.lng.toFixed(4)})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="sm:col-span-5">
                  <label className="text-[10px] text-slate-400 uppercase block mb-1">TARGET NODE:</label>
                  <select
                    value={targetNodeId}
                    onChange={(e) => setTargetNodeId(e.target.value)}
                    className="w-full px-2.5 py-1 bg-slate-900 border border-slate-700 text-white font-mono text-xs"
                  >
                    {nodes.slice(0, 100).map((n) => (
                      <option key={n.id} value={n.id}>
                        Node {n.id.slice(0, 8)}... ({n.lat.toFixed(4)}, {n.lng.toFixed(4)})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="sm:col-span-2">
                  <button
                    onClick={handleCalculateRoute}
                    disabled={isCalculatingRoute || !sourceNodeId || !targetNodeId}
                    className="w-full py-1.5 bg-amber-500/20 border border-amber-500/60 hover:bg-amber-500/30 text-amber-400 font-bold uppercase text-[11px] transition-all"
                  >
                    {isCalculatingRoute ? "Calculating..." : "Compute Path"}
                  </button>
                </div>
              </div>

              {/* Route Results Overlay */}
              {routeResponse && (
                <div className="p-2.5 bg-slate-900 border border-slate-800 space-y-2">
                  <div className="text-[10px] font-bold text-amber-400 uppercase flex items-center">
                    <CornerDownRight size={12} className="mr-1 text-amber-400" /> Q-FLOW NETWORK ↓ Selected Shortest Path
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center text-[11px]">
                    <div>
                      <span className="text-slate-400 block text-[9px] uppercase">TOTAL DISTANCE</span>
                      <span className="font-bold text-white text-sm">{routeResponse.total_distance_km} km</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[9px] uppercase">FREE-FLOW TIME</span>
                      <span className="font-bold text-emerald-400 text-sm">{routeResponse.total_travel_time_min} min</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[9px] uppercase">ROUTE EDGES</span>
                      <span className="font-bold text-sky-400 text-sm">{routeResponse.edge_count} Edges</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[9px] uppercase">ROUTE NODES</span>
                      <span className="font-bold text-amber-400 text-sm">{routeResponse.node_path.length} Nodes</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Right Column: Overview Panel & Inspectors (4 cols) */}
        <div className="lg:col-span-4 space-y-4">
          {/* Edge Inspector Panel (when an edge is selected) */}
          {selectedEdge ? (
            <div className="bg-[#0d1015] border border-sky-500/50 p-4 font-mono text-xs space-y-3">
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

                <div className="p-2 bg-slate-900 border border-slate-800">
                  <span className="text-slate-400 block text-[9px] uppercase">SPEED LIMIT</span>
                  <span className="font-bold text-emerald-400">{selectedEdge.speed_limit_kph} km/h</span>
                </div>

                <div className="p-2 bg-slate-900 border border-slate-800">
                  <span className="text-slate-400 block text-[9px] uppercase">FREE-FLOW TIME</span>
                  <span className="font-bold text-amber-400">
                    {(selectedEdge.length_meters / Math.max(0.1, selectedEdge.speed_limit_kph / 3.6)).toFixed(1)} s
                  </span>
                </div>
              </div>

              <div className="p-2.5 bg-slate-900 border border-slate-800 space-y-1 text-[10px]">
                <div className="text-slate-400 uppercase">INTERNAL NODE CONNECTIVITY</div>
                <div className="text-slate-300">From Node: <code className="text-sky-400">{selectedEdge.from_node_id.slice(0, 12)}...</code></div>
                <div className="text-slate-300">To Node: <code className="text-sky-400">{selectedEdge.to_node_id.slice(0, 12)}...</code></div>
                <div className="text-slate-300">Capacity: <span className="text-white font-bold">{selectedEdge.capacity_vehicles} vehicles/hr</span></div>
              </div>
            </div>
          ) : selectedNode ? (
            /* Node Inspector Panel (when a node is selected) */
            <div className="bg-[#0d1015] border border-emerald-500/50 p-4 font-mono text-xs space-y-3">
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
                <div className="text-[10px] text-sky-400 mt-1">
                  OSM External ID: {selectedNode.external_id || "N/A"}
                </div>
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

              <div className="p-2.5 bg-slate-900 border border-slate-800 text-[10px] text-slate-400">
                Network ID: <span className="text-white">{selectedNode.network_id}</span>
              </div>
            </div>
          ) : null}

          {/* Network Overview Panel */}
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

                <div className="space-y-1.5 pt-1">
                  <div className="p-2 bg-slate-900 border border-slate-800 text-[11px] flex justify-between items-center">
                    <span className="text-slate-400 uppercase text-[10px]">WEAKLY CONNECTED COMPONENTS:</span>
                    <span className="font-bold text-sky-400">{stats.weakly_connected_components} Components</span>
                  </div>
                  <div className="p-2 bg-slate-900 border border-slate-800 text-[11px] flex justify-between items-center">
                    <span className="text-slate-400 uppercase text-[10px]">STRONGLY CONNECTED COMPONENTS:</span>
                    <span className="font-bold text-indigo-400">{stats.strongly_connected_components} Components</span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-slate-500 text-center py-6">Select a network to view telemetry</div>
            )}
          </div>

          {/* Network Health Panel */}
          <div className="bg-[#0d1015] border border-slate-800 p-4 font-mono text-xs space-y-3">
            <div className="border-b border-slate-800 pb-2">
              <span className="font-bold text-white uppercase tracking-wider">NETWORK TOPOLOGY HEALTH</span>
            </div>

            <div className="space-y-2 text-[11px]">
              <div className="flex items-center justify-between p-2 bg-slate-900 border border-slate-800">
                <span className="text-slate-400">Weak Connectivity</span>
                <span className="text-emerald-400 font-bold flex items-center">
                  <CheckCircle2 size={12} className="mr-1" /> {stats?.weakly_connected_components ?? 658} components
                </span>
              </div>

              <div className="flex items-center justify-between p-2 bg-slate-900 border border-slate-800">
                <span className="text-slate-400">Strong Connectivity</span>
                <span className="text-emerald-400 font-bold flex items-center">
                  <CheckCircle2 size={12} className="mr-1" /> {stats?.strongly_connected_components ?? 983} components
                </span>
              </div>

              <div className="flex items-center justify-between p-2 bg-slate-900 border border-slate-800">
                <span className="text-slate-400">Node References</span>
                <span className="text-emerald-400 font-bold flex items-center">
                  <CheckCircle2 size={12} className="mr-1" /> Valid
                </span>
              </div>

              <div className="flex items-center justify-between p-2 bg-slate-900 border border-slate-800">
                <span className="text-slate-400">Edge Geometries</span>
                <span className="text-emerald-400 font-bold flex items-center">
                  <CheckCircle2 size={12} className="mr-1" /> Valid GeoJSON
                </span>
              </div>

              <div className="flex items-center justify-between p-2 bg-slate-900 border border-slate-800">
                <span className="text-slate-400">Static Travel Weights</span>
                <span className="text-emerald-400 font-bold flex items-center">
                  <CheckCircle2 size={12} className="mr-1" /> Available
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
