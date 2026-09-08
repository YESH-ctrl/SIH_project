import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  optimizationApi,
  networkApi,
  OptimizationRunResponse,
  NetworkNodeDTO,
  NetworkEdgeDTO,
  VehicleRouteResult,
} from "@/services/apiClient";
import { OSMVectorNetworkMap } from "./OSMVectorNetworkMap";
import {
  Cpu,
  Play,
  CheckCircle2,
  Sliders,
  Layers,
  ArrowRight,
  TrendingDown,
  Navigation,
  Clock,
  ShieldCheck,
  RotateCcw,
  Sparkles,
  AlertTriangle,
} from "lucide-react";

export function RouteOptimizationPage() {
  const [isRunning, setIsRunning] = useState(false);
  const [isCompleted, setIsCompleted] = useState(false);
  const [iteration, setIteration] = useState(0);
  const [optimizationData, setOptimizationData] = useState<OptimizationRunResponse | null>(null);
  const [selectedRoute, setSelectedRoute] = useState<VehicleRouteResult | null>(null);

  // Network graph state for map background
  const [nodes, setNodes] = useState<NetworkNodeDTO[]>([]);
  const [edges, setEdges] = useState<NetworkEdgeDTO[]>([]);

  // Advanced solver parameters
  const [popSize, setPopSize] = useState(30);
  const [maxIter, setMaxIter] = useState(100);

  const networkId = "9cb256c8-6c5a-4f05-8259-e8b887334fa2";

  // Fetch graph metadata for map overlay
  useEffect(() => {
    async function loadGraph() {
      try {
        const [ns, es] = await Promise.all([
          networkApi.getNetworkNodes(networkId, 1, 300),
          networkApi.getNetworkEdges(networkId, 1, 500),
        ]);
        setNodes(ns || []);
        setEdges(es || []);
      } catch (err) {
        console.warn("[RouteOptimizationPage] Graph load warning:", err);
      }
    }
    loadGraph();
  }, []);

  const startOptimization = async () => {
    setIsRunning(true);
    setIsCompleted(false);
    setIteration(0);
    setOptimizationData(null);
    setSelectedRoute(null);

    // Simulate progressive iteration status counter while waiting for QPSO solve
    const interval = setInterval(() => {
      setIteration((prev) => (prev < maxIter - 10 ? prev + 10 : prev));
    }, 200);

    try {
      const res = await optimizationApi.runDemo(popSize, maxIter, 42);
      clearInterval(interval);
      setIteration(maxIter);
      setOptimizationData(res);
      setIsRunning(false);
      setIsCompleted(true);
      if (res.qpso_routes && res.qpso_routes.length > 0) {
        setSelectedRoute(res.qpso_routes[0]);
      }
    } catch (err) {
      clearInterval(interval);
      setIsRunning(false);
      console.error("[RouteOptimizationPage] Optimization API Error:", err);
    }
  };

  const pipelineStages = [
    { label: "NETWORK", status: iteration > 10 ? "done" : isRunning ? "active" : "pending" },
    { label: "TRAFFIC", status: iteration > 25 ? "done" : iteration > 10 ? "active" : "pending" },
    { label: "VRP BUILD", status: iteration > 45 ? "done" : iteration > 25 ? "active" : "pending" },
    { label: "QPSO SOLVER", status: iteration > 75 ? "done" : iteration > 45 ? "active" : "pending" },
    { label: "CONSTRAINTS", status: iteration > 90 ? "done" : iteration > 75 ? "active" : "pending" },
    { label: "DISPATCH", status: isCompleted ? "done" : iteration >= 90 ? "active" : "pending" },
  ];

  return (
    <div className="space-y-4 font-sans text-white">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-800">
        <div>
          <h1 className="text-xl font-bold font-mono text-white tracking-tight uppercase flex items-center">
            <Cpu size={20} className="mr-2 text-sky-400" /> ROUTE OPTIMIZATION ENGINE (QPSO)
          </h1>
          <p className="text-xs text-slate-400 font-sans">
            Discrete Quantum-Inspired Particle Swarm Optimization for Multi-Vehicle Fleet Routing over OpenStreetMap.
          </p>
        </div>

        {isCompleted && (
          <Button
            onClick={startOptimization}
            variant="outline"
            className="border-slate-700 bg-slate-800 hover:bg-slate-700 text-white font-mono text-xs rounded-none"
          >
            <RotateCcw size={13} className="mr-1.5" /> RE-RUN QPSO SOLVER
          </Button>
        )}
      </div>

      {/* Horizontal Pipeline View */}
      <div className="p-3 bg-[#0d1015] border border-slate-800 font-mono text-xs overflow-x-auto">
        <div className="text-[10px] text-slate-400 uppercase font-semibold mb-2 flex items-center justify-between">
          <span className="flex items-center">
            <Layers size={12} className="mr-1 text-sky-400" /> Q-FLOW PIPELINE STAGES
          </span>
          <span className="text-[9.5px] text-emerald-400 font-bold">OSM DIRECTED GRAPH • QPSO METAHEURISTIC</span>
        </div>
        <div className="flex items-center justify-between min-w-[650px] gap-2">
          {pipelineStages.map((stage, idx) => (
            <React.Fragment key={stage.label}>
              <div
                className={`flex-1 p-2 border text-center font-bold text-[11px] transition-all ${
                  stage.status === "done"
                    ? "bg-emerald-500/10 border-emerald-500/40 text-emerald-400"
                    : stage.status === "active"
                    ? "bg-sky-500/20 border-sky-400 text-white animate-pulse"
                    : "bg-slate-900 border-slate-800 text-slate-500"
                }`}
              >
                {stage.label}
              </div>
              {idx < pipelineStages.length - 1 && <ArrowRight size={14} className="text-slate-600 shrink-0" />}
            </React.Fragment>
          ))}
        </div>
      </div>

      {/* Main Split Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Left Side: Configuration OR Live Progress OR Comparison */}
        <div className="lg:col-span-5 space-y-4">
          {!isRunning && !isCompleted && (
            <div className="bg-[#0d1015] border border-slate-800 p-5 font-mono text-xs space-y-5">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                <span className="font-bold text-white uppercase tracking-wider">SOLVER CONFIGURATION</span>
                <span className="text-[10px] text-sky-400">RAIPUR VRP DATASET</span>
              </div>

              {/* Input Specs */}
              <div className="grid grid-cols-2 gap-3 text-[11px]">
                <div className="p-2 bg-slate-900 border border-slate-800">
                  <span className="text-slate-400 block text-[9px] uppercase">NETWORK</span>
                  <span className="font-bold text-white">Raipur Urban OSM Network</span>
                </div>
                <div className="p-2 bg-slate-900 border border-slate-800">
                  <span className="text-slate-400 block text-[9px] uppercase">FLEET SIZE</span>
                  <span className="font-bold text-white">3 Electric Vehicles</span>
                </div>
                <div className="p-2 bg-slate-900 border border-slate-800">
                  <span className="text-slate-400 block text-[9px] uppercase">DELIVERIES</span>
                  <span className="font-bold text-white">10 Customer Stops</span>
                </div>
                <div className="p-2 bg-slate-900 border border-slate-800">
                  <span className="text-slate-400 block text-[9px] uppercase">DEPOT</span>
                  <span className="font-bold text-white">Raipur Central Depot</span>
                </div>
              </div>

              {/* Operational Constraints */}
              <div className="space-y-2">
                <div className="text-[10px] text-slate-400 font-bold uppercase">HARD CONSTRAINTS ENFORCED</div>
                <div className="grid grid-cols-2 gap-1.5 text-[11px]">
                  <div className="flex items-center text-emerald-400">
                    <ShieldCheck size={13} className="mr-1" /> Vehicle Capacity
                  </div>
                  <div className="flex items-center text-emerald-400">
                    <ShieldCheck size={13} className="mr-1" /> Depot Start & Return
                  </div>
                  <div className="flex items-center text-emerald-400">
                    <ShieldCheck size={13} className="mr-1" /> OSM Road Geometry
                  </div>
                  <div className="flex items-center text-emerald-400">
                    <ShieldCheck size={13} className="mr-1" /> Demand Delivery
                  </div>
                </div>
              </div>

              {/* Optimization Engine Info */}
              <div className="p-3 bg-slate-900 border border-slate-800 space-y-2">
                <div className="text-[10px] text-sky-400 font-bold uppercase">OPTIMIZATION ENGINE</div>
                <div className="font-bold text-white text-xs">
                  Discrete Quantum-Inspired Particle Swarm Optimization (QPSO)
                </div>
                <p className="text-[10px] text-slate-400 font-sans leading-relaxed">
                  Classical metaheuristic simulating quantum delta-potential wave function contraction over permutation solution spaces.
                </p>
              </div>

              {/* Parameters */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[9px] text-slate-400 uppercase block mb-1">PARTICLE POPULATION</label>
                  <input
                    type="number"
                    value={popSize}
                    onChange={(e) => setPopSize(Number(e.target.value))}
                    className="w-full bg-slate-900 border border-slate-800 p-1.5 text-xs text-white text-center rounded-none"
                  />
                </div>
                <div>
                  <label className="text-[9px] text-slate-400 uppercase block mb-1">ITERATIONS</label>
                  <input
                    type="number"
                    value={maxIter}
                    onChange={(e) => setMaxIter(Number(e.target.value))}
                    className="w-full bg-slate-900 border border-slate-800 p-1.5 text-xs text-white text-center rounded-none"
                  />
                </div>
              </div>

              <Button
                onClick={startOptimization}
                className="w-full bg-emerald-500 hover:bg-emerald-600 text-black font-bold uppercase py-3 rounded-none text-xs flex items-center justify-center space-x-2 shadow-lg"
              >
                <Play size={15} />
                <span>RUN Q-FLOW OPTIMIZATION</span>
              </Button>
            </div>
          )}

          {/* Active Optimization Progress Screen */}
          {isRunning && (
            <div className="bg-[#0d1015] border border-slate-800 p-5 font-mono text-xs space-y-4">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                <span className="font-bold text-sky-400 uppercase tracking-wider flex items-center">
                  <span className="w-2 h-2 rounded-full bg-sky-400 mr-2 animate-ping" /> SOLVING DISCRETE VRP...
                </span>
                <span className="text-slate-400">QPSO ACTIVE</span>
              </div>

              {/* Progress Bar */}
              <div className="space-y-1">
                <div className="flex justify-between text-[11px]">
                  <span className="text-slate-400">COMPUTE PROGRESS</span>
                  <span className="font-bold text-white">{Math.round((iteration / maxIter) * 100)}%</span>
                </div>
                <div className="w-full h-2 bg-slate-900 border border-slate-800 overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-sky-500 to-emerald-400 transition-all duration-200"
                    style={{ width: `${(iteration / maxIter) * 100}%` }}
                  />
                </div>
              </div>

              {/* Real-time Metrics Grid */}
              <div className="grid grid-cols-2 gap-3 text-[11px]">
                <div className="p-2.5 bg-slate-900 border border-slate-800">
                  <span className="text-slate-400 block text-[9px] uppercase">ITERATION</span>
                  <span className="text-xl font-bold text-white">{iteration} / {maxIter}</span>
                </div>
                <div className="p-2.5 bg-slate-900 border border-slate-800">
                  <span className="text-slate-400 block text-[9px] uppercase">SWARM PARTICLES</span>
                  <span className="text-xl font-bold text-white">{popSize} Particles</span>
                </div>
              </div>

              {/* Status Message */}
              <div className="p-3 bg-slate-900/90 border border-slate-800 text-[10px] text-slate-300 flex items-center">
                <Cpu size={14} className="mr-2 text-sky-400 animate-spin" />
                Executing shortest-path matrix evaluation & quantum probability updates...
              </div>
            </div>
          )}

          {/* Completed Optimization Results Summary */}
          {isCompleted && optimizationData && (
            <div className="bg-[#0d1015] border border-slate-800 p-5 font-mono text-xs space-y-4">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                <div className="flex items-center space-x-2 text-emerald-400 font-bold">
                  <CheckCircle2 size={18} />
                  <span className="uppercase tracking-wider">OPTIMIZATION COMPLETE</span>
                </div>
                <span className="text-[10px] text-slate-400">RUN ID: {optimizationData.run_id}</span>
              </div>

              {/* Baseline vs QPSO Comparison Cards (Phase 7 Requirement) */}
              <div className="grid grid-cols-2 gap-3 text-[11px]">
                {/* BASELINE CARD */}
                <div className="p-3 bg-slate-900/90 border border-slate-800 space-y-1.5">
                  <div className="text-[9.5px] text-amber-400 font-bold uppercase border-b border-slate-800 pb-1">
                    BASELINE (GREEDY VRP)
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[9px]">TOTAL DISTANCE</span>
                    <span className="text-base font-bold text-slate-200">
                      {optimizationData.baseline_metrics.total_distance_km} km
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[9px]">TRAVEL TIME</span>
                    <span className="text-base font-bold text-slate-200">
                      {optimizationData.baseline_metrics.total_travel_time_min} min
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[9px]">FITNESS SCORE</span>
                    <span className="text-sm font-mono text-slate-400">
                      {optimizationData.baseline_metrics.fitness_score}
                    </span>
                  </div>
                </div>

                {/* QPSO CARD */}
                <div className="p-3 bg-emerald-950/30 border border-emerald-500/40 space-y-1.5 relative">
                  <div className="text-[9.5px] text-emerald-400 font-bold uppercase border-b border-emerald-500/30 pb-1 flex justify-between">
                    <span>Q-FLOW (QPSO)</span>
                    <Sparkles size={11} className="text-emerald-400" />
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[9px]">TOTAL DISTANCE</span>
                    <span className="text-base font-bold text-emerald-400">
                      {optimizationData.qpso_metrics.total_distance_km} km
                    </span>
                    <span className="text-[9.5px] text-emerald-400 font-bold block">
                      -{optimizationData.distance_improvement_pct}% Distance
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[9px]">TRAVEL TIME</span>
                    <span className="text-base font-bold text-emerald-400">
                      {optimizationData.qpso_metrics.total_travel_time_min} min
                    </span>
                    <span className="text-[9.5px] text-emerald-400 font-bold block">
                      -{optimizationData.time_improvement_pct}% Time
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[9px]">SOLVER RUNTIME</span>
                    <span className="text-xs font-mono text-sky-400">
                      {optimizationData.runtime_ms} ms
                    </span>
                  </div>
                </div>
              </div>

              {/* Summary Chip */}
              <div className="p-2.5 bg-emerald-500/10 border border-emerald-500/30 text-[10.5px] text-emerald-300 font-bold flex items-center justify-between">
                <span>✓ {optimizationData.qpso_metrics.vehicles_used} Vehicles Coordinated • {optimizationData.qpso_metrics.total_demand_delivered} Units Delivered</span>
                <span className="text-[9.5px] bg-emerald-500/20 px-1.5 py-0.5 rounded text-emerald-300">
                  -{optimizationData.fitness_improvement_pct}% COST
                </span>
              </div>

              {/* Convergence Chart (Phase 14 Requirement) */}
              <div className="space-y-1 pt-1">
                <div className="flex justify-between text-[10px] text-slate-400 uppercase font-bold">
                  <span>QPSO CONVERGENCE (FITNESS VS ITERATION)</span>
                  <span className="text-emerald-400">{optimizationData.iterations} Iterations</span>
                </div>
                <div className="h-28 bg-slate-950 border border-slate-800 p-2 flex items-end justify-between gap-1">
                  {optimizationData.convergence_history.map((pt) => {
                    const maxF = optimizationData.baseline_metrics.fitness_score * 1.1;
                    const h = Math.max(12, Math.min(100, (1.0 - pt.best_fitness / maxF) * 100));
                    return (
                      <div
                        key={pt.iteration}
                        className="w-full bg-emerald-500/80 hover:bg-emerald-400 transition-all rounded-t-sm"
                        style={{ height: `${h}%` }}
                        title={`Iter: ${pt.iteration}, Fitness: ${pt.best_fitness}`}
                      />
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Right Side: OSM Optimization Map & Multi-Vehicle Routes Table */}
        <div className="lg:col-span-7 space-y-4">
          <div className="h-[380px] border border-slate-800 relative">
            <OSMVectorNetworkMap
              nodes={nodes}
              edges={edges}
              selectedEdge={null}
              selectedNode={null}
              routeResponse={null}
              mapMode="NETWORK"
              sourcePoint={null}
              targetPoint={null}
              layerVisibility={{
                basemap: true,
                roadNetwork: true,
                nodes: false,
                route: true,
                labels: true,
              }}
              vrpRoutes={optimizationData ? optimizationData.qpso_routes : undefined}
              depot={optimizationData?.depot}
              deliveryPoints={optimizationData?.delivery_points}
              onSelectEdge={() => {}}
              onSelectNode={() => {}}
            />
          </div>

          {/* Optimized Route Details Table */}
          <div className="bg-[#0d1015] border border-slate-800 p-4 font-mono text-xs space-y-3">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <span className="font-bold text-white uppercase tracking-wider">OPTIMIZED VEHICLE ROUTE DISPATCH</span>
              <span className="text-[10px] text-slate-400">MULTIPLE VEHICLE ROUTES (OSM ROAD NETWORK)</span>
            </div>

            <div className="overflow-x-auto max-h-[220px]">
              <table className="w-full text-left text-[11px]">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-400 uppercase text-[9px]">
                    <th className="py-2 px-2">VEHICLE</th>
                    <th className="py-2 px-2">STOPS</th>
                    <th className="py-2 px-2">DISTANCE</th>
                    <th className="py-2 px-2">TRAVEL TIME</th>
                    <th className="py-2 px-2">DEMAND / CAP</th>
                    <th className="py-2 px-2">UTILIZATION</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {optimizationData?.qpso_routes.map((vr) => {
                    const isSelected = selectedRoute?.vehicle_id === vr.vehicle_id;
                    return (
                      <tr
                        key={vr.vehicle_id}
                        onClick={() => setSelectedRoute(vr)}
                        className={`cursor-pointer transition-colors ${
                          isSelected ? "bg-slate-800 text-white font-bold" : "hover:bg-slate-900 text-slate-300"
                        }`}
                      >
                        <td className="py-2 px-2 font-bold flex items-center space-x-1.5">
                          <span
                            className="w-2.5 h-2.5 rounded-full"
                            style={{ backgroundColor: vr.color }}
                          />
                          <span>{vr.vehicle_name}</span>
                        </td>
                        <td className="py-2 px-2">{vr.stops.length} Stops</td>
                        <td className="py-2 px-2">{(vr.distance_meters / 1000).toFixed(2)} km</td>
                        <td className="py-2 px-2">{(vr.travel_time_seconds / 60).toFixed(1)} min</td>
                        <td className="py-2 px-2">{vr.total_demand} / {vr.capacity} units</td>
                        <td className="py-2 px-2 font-semibold text-emerald-400">{vr.utilization_pct}%</td>
                      </tr>
                    );
                  })}
                  {!optimizationData && (
                    <tr>
                      <td colSpan={6} className="py-4 text-center text-slate-500 italic">
                        Click "RUN Q-FLOW OPTIMIZATION" to calculate baseline vs QPSO multi-vehicle routes.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

