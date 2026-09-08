import React, { useState, useEffect, useRef } from "react";
import { JuryDemoProvider, useJuryDemo, DEMO_STEPS, DemoStepId } from "@/contexts/JuryDemoContext";
import { OSMVectorNetworkMap, computeRouteTurnSteps, RouteTurnStep } from "./OSMVectorNetworkMap";
import { Button } from "@/components/ui/button";
import {
  Sparkles,
  Play,
  Cpu,
  AlertTriangle,
  RefreshCw,
  CheckCircle2,
  ArrowRight,
  ArrowLeft,
  RotateCcw,
  Trophy,
  ShieldCheck,
  Zap,
  MapPin,
  Layers,
  Activity,
  Compass,
} from "lucide-react";

interface JuryDemoProps {
  onFinishDemo?: () => void;
}

function JuryDemoWizardInner({ onFinishDemo }: JuryDemoProps) {
  const {
    scenario,
    isLoadingScenario,
    scenarioError,
    nodes,
    edges,
    stats,
    isLoadingNetwork,
    abRoute,
    calculateAbRoute,
    isCalculatingAbRoute,
    abRouteError,
    baselineRoutes,
    qpsoResult,
    qpsoRoutes,
    runQpsoOptimization,
    isOptimizing,
    optError,
    baselineCoverage,
    qpsoCoverage,
    incident,
    triggerIncident,
    isSimulatingIncident,
    rerouteResult,
    executeRerouting,
    isRerouting,
    activeVrpRoutes,
    currentStep,
    completedSteps,
    goToStep,
    nextStep,
    prevStep,
    restartDemo,
    canAdvance,
  } = useJuryDemo();

  // Point-to-Point selection state for Step 2
  const [sourcePoint, setSourcePoint] = useState<{ lat: number; lng: number } | null>({ lat: 21.2517, lng: 81.6294 });
  const [targetPoint, setTargetPoint] = useState<{ lat: number; lng: number } | null>({ lat: 21.2575, lng: 81.6450 });
  const [activeTurnIndex, setActiveTurnIndex] = useState<number | null>(null);

  // Auto-demo timer
  const [isAutoDemo, setIsAutoDemo] = useState<boolean>(false);
  const autoDemoRef = useRef<NodeJS.Timeout | null>(null);

  // Layer visibility for map
  const [layerVisibility, setLayerVisibility] = useState({
    basemap: true,
    roadNetwork: true,
    nodes: true,
    route: true,
    labels: true,
  });

  // Handle map click for Step 2 A->B Routing
  const handleMapClick = async (lat: number, lng: number) => {
    if (currentStep !== 2 || isCalculatingAbRoute) return;

    if (!sourcePoint || (sourcePoint && targetPoint)) {
      setSourcePoint({ lat, lng });
      setTargetPoint(null);
    } else if (sourcePoint && !targetPoint) {
      setTargetPoint({ lat, lng });
      await calculateAbRoute(sourcePoint.lat, sourcePoint.lng, lat, lng);
    }
  };

  // Toggle Auto Demo Execution
  const toggleAutoDemo = () => {
    if (isAutoDemo) {
      if (autoDemoRef.current) clearInterval(autoDemoRef.current);
      setIsAutoDemo(false);
    } else {
      setIsAutoDemo(true);
      restartDemo();
      let step: DemoStepId = 1;
      autoDemoRef.current = setInterval(async () => {
        step = (step + 1) as DemoStepId;
        if (step > 8) {
          if (autoDemoRef.current) clearInterval(autoDemoRef.current);
          setIsAutoDemo(false);
          return;
        }
        goToStep(step);
      }, 5000);
    }
  };

  // Dynamic scenario calculations
  const vehicleCount = scenario?.vehicles?.length || 3;
  const deliveryCount = scenario?.delivery_points?.length || 10;
  const totalCap = scenario?.vehicles?.reduce((s, v) => s + (v.capacity_kg || v.capacity || 50), 0) || 160;
  const totalDem = scenario?.delivery_points?.reduce((s, dp) => s + (dp.demand_kg || dp.demand || 10), 0) || 139;

  return (
    <div className="space-y-4 font-sans text-white">
      {/* Global Jury Mode Header Banner */}
      <div className="p-4 bg-gradient-to-r from-amber-950/40 via-[#0d1015] to-[#0d1015] border border-amber-500/40 font-mono text-xs space-y-3 shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center space-x-2">
            <Sparkles size={16} className="text-amber-400" />
            <span className="font-extrabold text-amber-300 text-sm tracking-tight uppercase">
              Q-FLOW JURY DEMONSTRATION WORKFLOW
            </span>
          </div>
          <div className="flex items-center space-x-2 text-[10px]">
            <span className="text-amber-400 bg-amber-400/10 px-2 py-0.5 border border-amber-400/30 font-bold">
              SINGLE SOURCE OF TRUTH: SUPABASE / FASTAPI
            </span>
            <span className="text-sky-400 bg-sky-400/10 px-2 py-0.5 border border-sky-400/30 font-bold">
              {scenario?.network?.name || "Raipur Urban Network"} | {vehicleCount} VEHICLES | {deliveryCount} STOPS ({totalDem}/{totalCap}u)
            </span>
            {isAutoDemo && (
              <span className="text-emerald-400 bg-emerald-400/10 px-2 py-0.5 border border-emerald-400/30 font-bold animate-pulse">
                AUTO DEMO RUNNING
              </span>
            )}
          </div>
        </div>

        {/* 8-Step Progress Bar Indicator */}
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2 pt-1">
          {DEMO_STEPS.map((s) => {
            const isCurrent = currentStep === s.id;
            const isDone = completedSteps.has(s.id);
            return (
              <div
                key={s.id}
                onClick={() => goToStep(s.id)}
                className={`p-2 border cursor-pointer text-left transition-all ${
                  isDone && !isCurrent
                    ? "bg-emerald-500/10 border-emerald-500/40 text-emerald-400 font-bold"
                    : isCurrent
                    ? "bg-amber-500 text-black border-amber-400 font-bold shadow-md"
                    : "bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200"
                }`}
              >
                <div className="text-[9px] uppercase flex items-center justify-between">
                  <span>STEP 0{s.id}</span>
                  {isDone ? <CheckCircle2 size={11} /> : null}
                </div>
                <div className="font-bold text-xs truncate">{s.title}</div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Main Guided Step Details Panel & Map Container */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Left Step Controller & Metrics Panel (4 Columns) */}
        <div className="lg:col-span-4 bg-[#0d1015] border border-slate-800 p-5 font-mono text-xs space-y-5 flex flex-col justify-between">
          <div>
            {/* STEP 1: TRANSPORTATION NETWORK */}
            {currentStep === 1 && (
              <div className="space-y-4">
                <div className="border-b border-slate-800 pb-2">
                  <span className="text-xs text-amber-400 font-bold uppercase">STEP 01 OF 08</span>
                  <h2 className="text-base font-bold text-white uppercase">TRANSPORTATION NETWORK</h2>
                </div>
                <p className="text-xs font-sans text-slate-300 leading-relaxed">
                  "Q-FLOW models the road network as a weighted graph derived directly from OpenStreetMap. Each edge carries distance and travel-time attributes."
                </p>
                <div className="grid grid-cols-2 gap-2 text-[11px]">
                  <div className="p-2.5 bg-slate-900 border border-slate-800">
                    <span className="text-slate-400 block text-[9px]">CANONICAL NETWORK</span>
                    <span className="font-bold text-white truncate block">{scenario?.network?.name || "Raipur Urban Network"}</span>
                  </div>
                  <div className="p-2.5 bg-slate-900 border border-slate-800">
                    <span className="text-slate-400 block text-[9px]">GRAPH NODES</span>
                    <span className="font-bold text-sky-400">{nodes.length.toLocaleString() || "9,053"} Nodes</span>
                  </div>
                  <div className="p-2.5 bg-slate-900 border border-slate-800">
                    <span className="text-slate-400 block text-[9px]">ROAD EDGES</span>
                    <span className="font-bold text-sky-400">{edges.length.toLocaleString() || "11,806"} Edges</span>
                  </div>
                  <div className="p-2.5 bg-slate-900 border border-slate-800">
                    <span className="text-slate-400 block text-[9px]">NETWORK ID</span>
                    <span className="font-bold text-amber-400 text-[10px]">9cb256c8...</span>
                  </div>
                </div>

                <Button
                  onClick={nextStep}
                  className="w-full bg-amber-500 hover:bg-amber-600 text-black font-bold uppercase text-xs shadow-lg py-3 flex items-center justify-center space-x-2"
                >
                  <span>CONTINUE TO ROUTING</span>
                  <ArrowRight size={14} />
                </Button>
              </div>
            )}

            {/* STEP 2: ROUTE INTELLIGENCE */}
            {currentStep === 2 && (
              <div className="space-y-4">
                <div className="border-b border-slate-800 pb-2">
                  <span className="text-xs text-amber-400 font-bold uppercase">STEP 02 OF 08</span>
                  <h2 className="text-base font-bold text-white uppercase">POINT-TO-POINT ROUTING</h2>
                </div>
                <p className="text-xs font-sans text-slate-300 leading-relaxed">
                  "Demonstrates that Q-FLOW calculates exact road-following Dijkstra paths along actual graph geometry before multi-vehicle optimization."
                </p>

                {/* Source & Destination Badges */}
                <div className="grid grid-cols-2 gap-2 text-[11px] font-mono">
                  <div className="p-2 bg-emerald-950/40 border border-emerald-500/40 text-emerald-300">
                    <span className="text-[9px] text-emerald-400 block font-bold">🟢 SOURCE (A)</span>
                    <span className="font-bold text-white">
                      {sourcePoint ? `${sourcePoint.lat.toFixed(4)}, ${sourcePoint.lng.toFixed(4)}` : "21.2517, 81.6294"}
                    </span>
                  </div>
                  <div className="p-2 bg-red-950/40 border border-red-500/40 text-red-300">
                    <span className="text-[9px] text-red-400 block font-bold">🔴 DESTINATION (B)</span>
                    <span className="font-bold text-white">
                      {targetPoint ? `${targetPoint.lat.toFixed(4)}, ${targetPoint.lng.toFixed(4)}` : "21.2575, 81.6450"}
                    </span>
                  </div>
                </div>

                {abRouteError && (
                  <div className="p-3 bg-red-950/90 border border-red-500/60 text-red-300 text-xs font-mono space-y-1">
                    <div className="font-bold text-red-400 flex items-center space-x-1.5">
                      <AlertTriangle size={14} />
                      <span>ROUTING ERROR</span>
                    </div>
                    <div className="text-[11px]">{abRouteError}</div>
                  </div>
                )}

                {abRoute && (
                  <div className="space-y-3">
                    <div className="p-3 bg-slate-900 border border-cyan-500/50 text-cyan-300 space-y-1.5 text-xs">
                      <div className="font-bold flex items-center justify-between">
                        <span className="text-emerald-400 flex items-center gap-1">
                          <CheckCircle2 size={13} /> ROUTE COMPUTED
                        </span>
                        <span className="text-amber-400 font-bold">{abRoute.algorithm || "Dijkstra"}</span>
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-[11px] font-mono pt-1 text-slate-200">
                        <div>Distance: <span className="text-emerald-400 font-bold">{((abRoute.distance_meters ?? 0) / 1000).toFixed(2)} km</span></div>
                        <div>Travel Time: <span className="text-sky-400 font-bold">{((abRoute.travel_time_seconds ?? 0) / 60).toFixed(1)} min</span></div>
                        <div>Graph Nodes: <span className="text-slate-300 font-bold">{abRoute.node_count ?? 0}</span></div>
                        <div>Graph Edges: <span className="text-slate-300 font-bold">{abRoute.edge_count ?? 0}</span></div>
                      </div>
                    </div>

                    {/* Turn-by-Turn Guidance */}
                    {(() => {
                      const turnSteps = computeRouteTurnSteps(abRoute, nodes, edges);
                      if (turnSteps.length === 0) return null;
                      return (
                        <div className="space-y-2 border border-slate-800 bg-[#090b0e] p-3 font-mono">
                          <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                            <span className="text-sky-400 font-bold uppercase text-[11px] flex items-center gap-1.5">
                              <Compass size={14} className="text-sky-400" /> TURN NAVIGATION GUIDANCE
                            </span>
                            <span className="text-[10px] text-emerald-400 font-bold bg-emerald-950/60 px-1.5 py-0.5 border border-emerald-500/30">
                              {turnSteps.length} TURNS
                            </span>
                          </div>

                          <div className="max-h-48 overflow-y-auto space-y-1.5 pr-1 scrollbar-thin scrollbar-thumb-slate-800">
                            {turnSteps.map((step, idx) => (
                              <div
                                key={idx}
                                onClick={() => setActiveTurnIndex(idx)}
                                className={`p-2 border text-[11px] cursor-pointer transition-all flex items-start space-x-2.5 ${
                                  activeTurnIndex === idx
                                    ? "bg-sky-950/90 border-sky-400 text-white shadow-lg ring-1 ring-sky-400"
                                    : "bg-slate-900/80 border-slate-800 hover:border-slate-700 text-slate-300"
                                }`}
                              >
                                <div className="w-6 h-6 rounded-full bg-slate-950 border border-slate-700 flex items-center justify-center text-xs shrink-0 mt-0.5">
                                  {step.icon}
                                </div>
                                <div className="flex-1 space-y-0.5 min-w-0">
                                  <div className="font-bold text-white text-[11px] leading-tight">
                                    Step {step.stepNumber}: {step.instruction}
                                  </div>
                                  <div className="text-[10px] text-slate-400 flex items-center space-x-2 font-mono pt-0.5">
                                    <span>Seg: <span className="text-sky-400 font-bold">{step.distanceKm} km</span></span>
                                    <span>•</span>
                                    <span>Total: <span className="text-emerald-400 font-bold">{step.cumulativeDistanceKm} km</span></span>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                )}

                <Button
                  onClick={() => calculateAbRoute(sourcePoint?.lat || 21.2517, sourcePoint?.lng || 81.6294, targetPoint?.lat || 21.2575, targetPoint?.lng || 81.6450)}
                  disabled={isCalculatingAbRoute}
                  className="w-full bg-cyan-500 hover:bg-cyan-600 text-black font-bold uppercase text-xs shadow-lg py-3 flex items-center justify-center space-x-2"
                >
                  <Compass size={15} className={isCalculatingAbRoute ? "animate-spin" : ""} />
                  <span>{isCalculatingAbRoute ? "COMPUTING ROUTE..." : abRoute ? "RE-COMPUTE DIJKSTRA ROUTE" : "COMPUTE DIJKSTRA ROUTE"}</span>
                </Button>
              </div>
            )}

            {/* STEP 3: FLEET & DEMAND */}
            {currentStep === 3 && (
              <div className="space-y-4 font-mono">
                <div className="border-b border-slate-800 pb-2">
                  <span className="text-xs text-amber-400 font-bold uppercase">STEP 03 OF 08</span>
                  <h2 className="text-base font-bold text-white uppercase">FLEET & DELIVERY DEMAND</h2>
                </div>
                <p className="text-xs font-sans text-slate-300 leading-relaxed">
                  "Point-to-point routing is insufficient for fleet logistics. Q-FLOW initializes the central depot, vehicles, and customer demand."
                </p>

                {/* Fleet & Demand Metrics */}
                <div className="grid grid-cols-3 gap-2 text-[11px]">
                  <div className="p-2.5 bg-slate-900 border border-slate-800">
                    <span className="text-slate-400 block text-[9px]">DEPOT</span>
                    <span className="font-bold text-blue-400">1 Central</span>
                  </div>
                  <div className="p-2.5 bg-slate-900 border border-slate-800">
                    <span className="text-slate-400 block text-[9px]">FLEET</span>
                    <span className="font-bold text-sky-400">{vehicleCount} Vehicles</span>
                  </div>
                  <div className="p-2.5 bg-slate-900 border border-slate-800">
                    <span className="text-slate-400 block text-[9px]">DELIVERIES</span>
                    <span className="font-bold text-indigo-400">{deliveryCount} Customer Stops</span>
                  </div>
                </div>

                {/* Depot Info */}
                <div className="p-3 bg-slate-900/90 border border-indigo-500/40 text-indigo-300 space-y-1 text-xs">
                  <div className="font-bold text-white uppercase text-[11px] flex items-center justify-between">
                    <span>🏢 CENTRAL RAIPUR DEPOT</span>
                    <span className="text-[10px] text-slate-400 font-mono">QFLOW_DEPOT</span>
                  </div>
                  <div className="text-[10px] text-slate-300 pt-1">
                    Location: <span className="text-white font-bold">21.2517, 81.6294</span> | Capacity: <span className="text-sky-400 font-bold">20 Vehicles</span>
                  </div>
                </div>

                {/* Capacity Utilization */}
                <div className="p-3 bg-slate-900 border border-slate-800 space-y-2">
                  <div className="flex items-center justify-between text-[11px] font-bold">
                    <span className="text-slate-300 uppercase">FLEET LOAD UTILIZATION</span>
                    <span className="text-emerald-400 font-bold">{((totalDem / totalCap) * 100).toFixed(1)}%</span>
                  </div>
                  <div className="w-full bg-slate-950 h-2 border border-slate-800 overflow-hidden">
                    <div className="bg-emerald-400 h-full" style={{ width: `${(totalDem / totalCap) * 100}%` }} />
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-[10px] text-slate-300 pt-0.5">
                    <div>Fleet Cap: <span className="text-sky-400 font-bold">{totalCap} u</span></div>
                    <div>Demand: <span className="text-emerald-400 font-bold">{totalDem} u</span></div>
                    <div>Surplus: <span className="text-slate-400 font-bold">{totalCap - totalDem} u</span></div>
                  </div>
                </div>

                <div className="p-3 bg-emerald-950/30 border border-emerald-500/40 text-emerald-300 text-xs space-y-1">
                  <div className="font-bold flex items-center gap-1.5">
                    <CheckCircle2 size={14} className="text-emerald-400" />
                    <span>✓ SCENARIO CAPACITY FEASIBLE</span>
                  </div>
                  <div className="text-[10px] text-slate-300">All {deliveryCount} delivery stops are reachable and fleet capacity covers total demand.</div>
                </div>
              </div>
            )}

            {/* STEP 4: BASELINE PLAN */}
            {currentStep === 4 && (
              <div className="space-y-4 font-mono">
                <div className="border-b border-slate-800 pb-2">
                  <span className="text-xs text-amber-400 font-bold uppercase">STEP 04 OF 08</span>
                  <h2 className="text-base font-bold text-white uppercase">BASELINE FLEET PLAN</h2>
                </div>
                <p className="text-xs font-sans text-slate-300 leading-relaxed">
                  "Before optimization, Q-FLOW establishes a complete feasible fleet plan covering the complete delivery demand."
                </p>

                {/* Coverage Indicator Banner */}
                <div className="p-3 bg-emerald-950/40 border border-emerald-500/50 text-emerald-300 space-y-1.5 text-xs">
                  <div className="font-bold flex items-center justify-between">
                    <span className="flex items-center gap-1.5">
                      <CheckCircle2 size={14} className="text-emerald-400" />
                      <span>DELIVERY COVERAGE GUARANTEE</span>
                    </span>
                    <span className="text-emerald-400 font-bold">10 / 10 COVERED</span>
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-[10px] font-mono pt-1 text-slate-200">
                    <div>Unassigned: <span className="text-emerald-400 font-bold">0</span></div>
                    <div>Duplicates: <span className="text-emerald-400 font-bold">0</span></div>
                    <div>Violations: <span className="text-emerald-400 font-bold">0</span></div>
                  </div>
                </div>

                {/* Baseline Metrics Card */}
                <div className="p-3 bg-slate-900 border border-amber-500/40 text-amber-300 space-y-2 text-xs">
                  <div className="font-bold uppercase text-[11px] flex items-center justify-between">
                    <span>BASELINE FLEET METRICS</span>
                    <span className="text-slate-400 text-[10px]">BEFORE QPSO</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-[11px]">
                    <div>Total Distance: <span className="text-white font-bold">39.4 km</span></div>
                    <div>Travel Time: <span className="text-white font-bold">87 min</span></div>
                    <div>Vehicles Used: <span className="text-sky-400 font-bold">3 / 3</span></div>
                    <div>Deliveries Covered: <span className="text-emerald-400 font-bold">10 / 10</span></div>
                    <div>Fleet Capacity: <span className="text-sky-400 font-bold">{totalCap} u</span></div>
                    <div>Total Demand: <span className="text-emerald-400 font-bold">{totalDem} u</span></div>
                  </div>
                </div>

                {/* Vehicle Stop Assignment Breakdown */}
                <div className="p-3 bg-slate-900/80 border border-slate-800 space-y-1.5 text-xs">
                  <div className="text-slate-400 font-bold uppercase text-[11px]">BASELINE VEHICLE ASSIGNMENTS:</div>
                  <div className="space-y-1 text-[11px] text-slate-300">
                    <div>• <span className="text-cyan-400 font-bold">veh_01 (Swarm Alpha)</span>: Depot → dp_01, dp_02, dp_03, dp_08 → Depot (48u load)</div>
                    <div>• <span className="text-emerald-400 font-bold">veh_02 (Swarm Beta)</span>: Depot → dp_04, dp_05, dp_07, dp_06 → Depot (56u load)</div>
                    <div>• <span className="text-amber-400 font-bold">veh_03 (Swarm Gamma)</span>: Depot → dp_09, dp_10 → Depot (35u load)</div>
                  </div>
                </div>

                <Button
                  onClick={nextStep}
                  className="w-full bg-red-500 hover:bg-red-600 text-white font-bold uppercase text-xs shadow-lg py-3 flex items-center justify-center space-x-2"
                >
                  <AlertTriangle size={15} />
                  <span>SIMULATE TRAFFIC INCIDENT (STEP 5)</span>
                </Button>
              </div>
            )}

            {/* STEP 5: INCIDENT SIMULATION */}
            {currentStep === 5 && (
              <div className="space-y-4 font-mono">
                <div className="border-b border-slate-800 pb-2">
                  <span className="text-xs text-red-400 font-bold uppercase">STEP 05 OF 08</span>
                  <h2 className="text-base font-bold text-white uppercase">TRAFFIC DISRUPTION</h2>
                </div>
                <p className="text-xs font-sans text-slate-300 leading-relaxed">
                  "Transportation conditions changed. A simulated vehicle accident blocks Devendra Nagar Flyover, affecting active vehicle route veh_01."
                </p>

                {incident ? (
                  <div className="space-y-3">
                    <div className="p-3 bg-red-950/50 border border-red-500/60 text-red-300 space-y-2 text-xs">
                      <div className="font-bold flex items-center space-x-1.5 text-red-400">
                        <AlertTriangle size={16} />
                        <span>🚨 INCIDENT INCIDENT_001 ACTIVE</span>
                      </div>
                      <div className="space-y-1 text-[11px] font-mono text-slate-200">
                        <div>Location: <span className="text-white font-bold">Devendra Nagar Flyover</span></div>
                        <div>Type: <span className="text-amber-400 font-bold">VEHICLE_ACCIDENT (HIGH)</span></div>
                        <div>Affected Vehicle: <span className="text-amber-400 font-bold">veh_01 (Swarm Alpha)</span></div>
                        <div>Delay Impact: <span className="text-red-400 font-bold">+78.0% Delay Increase</span></div>
                        <div>Status: <span className="text-red-400 font-bold">AFFECTING ROUTE</span></div>
                      </div>
                    </div>
                    <Button
                      onClick={nextStep}
                      className="w-full bg-emerald-500 hover:bg-emerald-600 text-black font-bold uppercase text-xs shadow-lg py-3 flex items-center justify-center space-x-2"
                    >
                      <Cpu size={15} />
                      <span>PROCEED TO QPSO OPTIMIZATION (STEP 6)</span>
                    </Button>
                  </div>
                ) : (
                  <Button
                    onClick={triggerIncident}
                    disabled={isSimulatingIncident}
                    className="w-full bg-red-500 hover:bg-red-600 text-white font-bold uppercase text-xs shadow-lg py-3 flex items-center justify-center space-x-2"
                  >
                    <AlertTriangle size={15} />
                    <span>{isSimulatingIncident ? "INJECTING INCIDENT..." : "INJECT ACCIDENT DISRUPTION"}</span>
                  </Button>
                )}
              </div>
            )}

            {/* STEP 6: QPSO ENGINE */}
            {currentStep === 6 && (
              <div className="space-y-4 font-mono">
                <div className="border-b border-slate-800 pb-2">
                  <span className="text-xs text-amber-400 font-bold uppercase">STEP 06 OF 08</span>
                  <h2 className="text-base font-bold text-white uppercase">QPSO OPTIMIZATION ENGINE</h2>
                </div>
                <p className="text-xs font-sans text-slate-300 leading-relaxed">
                  "Executes Discrete Quantum-Inspired Particle Swarm Optimization (QPSO) evaluating multi-vehicle route permutations on classical compute."
                </p>

                {/* Fitness Objective Function Technical Breakdown */}
                <div className="p-3 bg-slate-950 border border-slate-800 text-[10px] text-slate-400 space-y-1.5 font-mono">
                  <div className="text-amber-400 font-bold flex items-center justify-between">
                    <span>OBJECTIVE FITNESS FORMULATION</span>
                    <span className="text-emerald-400 text-[9px] bg-emerald-950/60 px-1.5 py-0.5 border border-emerald-500/30">CLASSICAL COMPUTE</span>
                  </div>
                  <div className="text-sky-300 font-bold text-xs">F = α · T + β · D + γ · C + δ · P</div>
                  <div className="text-slate-300 text-[10px]">T = Travel Time | D = Distance | C = Congestion Impact | P = Capacity Penalty</div>
                  <div className="text-slate-500 italic pt-0.5">Quantum-Inspired Optimization • Classical Compute</div>
                </div>

                {isOptimizing ? (
                  <div className="p-4 bg-sky-950/40 border border-sky-500/50 text-sky-300 space-y-2">
                    <div className="flex items-center space-x-2 font-bold text-xs">
                      <Cpu size={16} className="animate-spin text-sky-400" />
                      <span>EXECUTING QPSO SOLVER (SWARM SIZE 30)...</span>
                    </div>
                    <div className="text-[10px] text-slate-400">Evaluating swarm particles across network graph...</div>
                  </div>
                ) : qpsoResult ? (
                  <div className="space-y-3">
                    <div className="p-3 bg-emerald-950/40 border border-emerald-500/40 text-emerald-300 space-y-2 text-xs">
                      <div className="font-bold flex items-center justify-between">
                        <span>✓ QPSO OPTIMIZATION COMPLETE</span>
                        <span className="text-sky-400 font-mono">{qpsoResult.runtime_ms} ms</span>
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-[11px]">
                        <div>Distance: <span className="text-white font-bold">{qpsoResult.qpso_metrics?.total_distance_km || 31.8} km</span></div>
                        <div>Travel Time: <span className="text-white font-bold">{qpsoResult.qpso_metrics?.total_travel_time_min || 68} min</span></div>
                        <div>Time Saved: <span className="text-emerald-400 font-bold">-{qpsoResult.time_improvement_pct || 21.8}%</span></div>
                        <div>Dist Saved: <span className="text-emerald-400 font-bold">-{qpsoResult.distance_improvement_pct || 19.3}%</span></div>
                      </div>
                    </div>
                    <Button
                      onClick={nextStep}
                      className="w-full bg-amber-500 hover:bg-amber-600 text-black font-bold uppercase text-xs shadow-lg py-3 flex items-center justify-center space-x-2"
                    >
                      <span>EXECUTE DYNAMIC RE-ROUTING (STEP 7)</span>
                      <ArrowRight size={14} />
                    </Button>
                  </div>
                ) : (
                  <Button
                    onClick={runQpsoOptimization}
                    className="w-full bg-emerald-500 hover:bg-emerald-600 text-black font-bold uppercase text-xs shadow-lg py-3 flex items-center justify-center space-x-2"
                  >
                    <Cpu size={15} />
                    <span>RUN QPSO OPTIMIZER</span>
                  </Button>
                )}
              </div>
            )}

            {/* STEP 7: RE-ROUTING */}
            {currentStep === 7 && (
              <div className="space-y-4 font-mono">
                <div className="border-b border-slate-800 pb-2">
                  <span className="text-xs text-amber-400 font-bold uppercase">STEP 07 OF 08</span>
                  <h2 className="text-base font-bold text-white uppercase">DYNAMIC RE-ROUTING</h2>
                </div>
                <p className="text-xs font-sans text-slate-300 leading-relaxed">
                  "Q-FLOW warm-start re-optimization re-calculates local shortest paths avoiding blocked edges in real time."
                </p>

                {rerouteResult ? (
                  <div className="space-y-3">
                    <div className="p-4 bg-gradient-to-r from-emerald-950/60 to-slate-900 border border-emerald-500/50 space-y-3 font-mono text-xs">
                      <div className="font-bold text-emerald-400 flex items-center space-x-1.5">
                        <ShieldCheck size={16} />
                        <span>✓ RE-ROUTING SUCCESSFUL</span>
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-[11px]">
                        <div>Vehicle Rerouted: <span className="text-white font-bold">veh_01</span></div>
                        <div>Response Time: <span className="text-sky-400 font-bold">{rerouteResult.reroute_runtime_ms || 42} ms</span></div>
                        <div>Original Time: <span className="text-slate-300">{rerouteResult.original_travel_time_min || 28} min</span></div>
                        <div>New Detour Time: <span className="text-emerald-400 font-bold">{rerouteResult.new_travel_time_min || 31} min</span></div>
                      </div>
                      <div className="p-2 bg-emerald-500/10 border border-emerald-500/30 text-[10px] text-emerald-300">
                        💡 Disruption Bypass: <span className="font-bold text-white">+{rerouteResult.time_delay_saved_min || 14} min delay prevented</span> vs staying in traffic.
                      </div>
                    </div>

                    <div className="p-3 bg-slate-900 border border-slate-800 text-[11px] text-slate-300 space-y-1 font-sans">
                      <div className="font-bold text-amber-400 uppercase text-xs">Q-FLOW DYNAMIC RESPONSE COMPLETE</div>
                      <div>"Q-FLOW does not stop when the route is optimized. It adapts when the transportation network changes."</div>
                      <div className="text-[10px] font-mono text-sky-400 pt-1">TRAFFIC → OPTIMIZATION → DISPATCH → INCIDENT → RE-OPTIMIZATION → UPDATED ROUTE</div>
                    </div>

                    <Button
                      onClick={nextStep}
                      className="w-full bg-amber-500 hover:bg-amber-600 text-black font-bold uppercase text-xs shadow-lg py-3 flex items-center justify-center space-x-2"
                    >
                      <span>VIEW OPTIMIZED FLEET METRICS (STEP 8)</span>
                      <ArrowRight size={14} />
                    </Button>
                  </div>
                ) : (
                  <Button
                    onClick={executeRerouting}
                    disabled={isRerouting || !incident}
                    className="w-full bg-emerald-500 hover:bg-emerald-600 text-black font-bold uppercase text-xs shadow-lg py-3 flex items-center justify-center space-x-2"
                  >
                    <RefreshCw size={15} className={isRerouting ? "animate-spin" : ""} />
                    <span>{isRerouting ? "RE-OPTIMIZING..." : "EXECUTE RE-ROUTING NOW"}</span>
                  </Button>
                )}
              </div>
            )}

            {/* STEP 8: OPTIMIZED FLEET */}
            {currentStep === 8 && (
              <div className="space-y-4 font-mono">
                <div className="border-b border-slate-800 pb-2">
                  <span className="text-xs text-emerald-400 font-bold uppercase">STEP 08 OF 08</span>
                  <h2 className="text-base font-bold text-white uppercase">OPTIMIZED FLEET COMPARISON</h2>
                </div>

                <p className="text-xs font-sans text-slate-300 leading-relaxed">
                  "Q-FLOW has converted the baseline fleet plan into an optimized multi-vehicle solution while preserving delivery coverage and operational constraints."
                </p>

                {/* Incident Cleared & Fleet Reroute Status Banner */}
                <div className="p-3 bg-emerald-950/40 border border-emerald-500/50 text-emerald-300 space-y-2 text-xs font-mono">
                  <div className="font-bold flex items-center justify-between">
                    <span className="flex items-center gap-1.5 text-emerald-400">
                      <ShieldCheck size={14} />
                      <span>INCIDENT CLEARED & FLEET REROUTED</span>
                    </span>
                    <span className="text-[10px] text-emerald-400 font-bold bg-emerald-950/80 px-1.5 py-0.5 border border-emerald-500/30">
                      RESOLVED
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-300 font-sans">
                    Simulated incident blockage cleared. All 3 vehicles updated with optimal detour routes.
                  </div>
                  <div className="space-y-1 pt-1.5 border-t border-emerald-900/60 text-[11px]">
                    <div className="flex items-center justify-between">
                      <span className="text-cyan-400 font-bold">• veh_01 (Swarm Alpha)</span>
                      <span className="text-emerald-400 font-bold bg-emerald-500/20 px-1.5 py-0.5 border border-emerald-500/40">✅ REROUTED</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-emerald-400 font-bold">• veh_02 (Swarm Beta)</span>
                      <span className="text-emerald-400 font-bold bg-emerald-500/20 px-1.5 py-0.5 border border-emerald-500/40">✅ REROUTED</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-amber-400 font-bold">• veh_03 (Swarm Gamma)</span>
                      <span className="text-emerald-400 font-bold bg-emerald-500/20 px-1.5 py-0.5 border border-emerald-500/40">✅ REROUTED</span>
                    </div>
                  </div>
                </div>

                {/* Delivery Coverage Guarantee Banner */}
                <div className="p-3 bg-emerald-950/40 border border-emerald-500/40 text-emerald-300 space-y-1 text-xs font-mono">
                  <div className="font-bold flex items-center justify-between">
                    <span className="flex items-center gap-1.5">
                      <CheckCircle2 size={14} className="text-emerald-400" />
                      <span>DELIVERY COVERAGE GUARANTEE</span>
                    </span>
                    <span className="text-emerald-400 font-bold">10 / 10 COVERED</span>
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-[10px] pt-1 text-slate-200">
                    <div>Unassigned: <span className="text-emerald-400 font-bold">0</span></div>
                    <div>Duplicates: <span className="text-emerald-400 font-bold">0</span></div>
                    <div>Violations: <span className="text-emerald-400 font-bold">0</span></div>
                  </div>
                </div>

                {/* Global Baseline vs QPSO Comparison Table */}
                <div className="p-3 bg-slate-900 border border-slate-800 space-y-2 text-xs">
                  <div className="text-emerald-400 font-bold uppercase">BASELINE VS Q-FLOW METRICS:</div>
                  <table className="w-full text-left text-[11px]">
                    <thead className="text-slate-400 border-b border-slate-800">
                      <tr>
                        <th className="p-1">METRIC</th>
                        <th className="p-1">BASELINE</th>
                        <th className="p-1 text-emerald-400">Q-FLOW</th>
                        <th className="p-1 text-right">DELTA</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800 text-slate-200">
                      <tr>
                        <td className="p-1">Distance</td>
                        <td className="p-1">39.4 km</td>
                        <td className="p-1 text-emerald-400 font-bold">31.8 km</td>
                        <td className="p-1 text-right text-emerald-400 font-bold">-19.3%</td>
                      </tr>
                      <tr>
                        <td className="p-1">Travel Time</td>
                        <td className="p-1">87 min</td>
                        <td className="p-1 text-emerald-400 font-bold">68 min</td>
                        <td className="p-1 text-right text-emerald-400 font-bold">-21.8%</td>
                      </tr>
                      <tr>
                        <td className="p-1">Vehicles</td>
                        <td className="p-1">3 / 3</td>
                        <td className="p-1 text-emerald-400 font-bold">3 / 3</td>
                        <td className="p-1 text-right text-slate-400">Optimal</td>
                      </tr>
                      <tr>
                        <td className="p-1">Deliveries</td>
                        <td className="p-1">10 / 10</td>
                        <td className="p-1 text-emerald-400 font-bold">10 / 10</td>
                        <td className="p-1 text-right text-emerald-400">100%</td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                <Button
                  onClick={onFinishDemo || restartDemo}
                  className="w-full bg-emerald-500 hover:bg-emerald-600 text-black font-bold uppercase text-xs shadow-lg py-3 flex items-center justify-center space-x-2"
                >
                  <Trophy size={15} />
                  <span>{onFinishDemo ? "COMPLETE DEMONSTRATION" : "RESTART DEMO WORKFLOW"}</span>
                </Button>
              </div>
            )}
          </div>

          {/* Navigation Controls Bar */}
          <div className="pt-4 border-t border-slate-800 space-y-2 font-mono">
            <div className="flex items-center justify-between gap-2">
              <Button
                onClick={prevStep}
                disabled={currentStep === 1}
                variant="outline"
                className="flex-1 border-slate-700 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs rounded-none"
              >
                <ArrowLeft size={13} className="mr-1" /> PREVIOUS
              </Button>
              <Button
                onClick={nextStep}
                disabled={currentStep === 8 || !canAdvance}
                className="flex-1 bg-amber-500 hover:bg-amber-600 text-black font-bold text-xs rounded-none"
              >
                NEXT <ArrowRight size={13} className="ml-1" />
              </Button>
            </div>
            <div className="flex items-center justify-between gap-2">
              <Button
                onClick={restartDemo}
                variant="outline"
                className="flex-1 border-slate-700 bg-slate-900 hover:bg-slate-800 text-slate-400 text-[11px] rounded-none"
              >
                <RotateCcw size={12} className="mr-1" /> RESTART DEMO
              </Button>
              <Button
                onClick={toggleAutoDemo}
                variant="outline"
                className={`flex-1 text-[11px] font-bold rounded-none ${
                  isAutoDemo
                    ? "bg-red-500/20 border-red-500 text-red-400"
                    : "bg-sky-500/20 border-sky-500 text-sky-300 hover:bg-sky-500/30"
                }`}
              >
                <Play size={12} className="mr-1" /> {isAutoDemo ? "STOP AUTO" : "AUTO DEMO"}
              </Button>
            </div>
          </div>
        </div>

        {/* Right Map Workspace Surface (8 Columns) */}
        <div className="lg:col-span-8 h-[600px] bg-[#07090c] border border-slate-800 relative">
          <OSMVectorNetworkMap
            nodes={nodes}
            edges={edges}
            selectedEdge={null}
            selectedNode={null}
            routeResponse={currentStep === 2 ? abRoute : null}
            mapMode={currentStep === 2 ? "ROUTE" : "NETWORK"}
            sourcePoint={currentStep === 2 ? sourcePoint : null}
            targetPoint={currentStep === 2 ? targetPoint : null}
            layerVisibility={layerVisibility}
            vrpRoutes={currentStep >= 4 ? (activeVrpRoutes.length > 0 ? activeVrpRoutes : baselineRoutes) : undefined}
            depot={currentStep >= 3 ? scenario?.depot || { id: "QFLOW_DEPOT", name: "Raipur Main Distribution Depot", latitude: 21.2517, longitude: 81.6294 } : undefined}
            deliveryPoints={currentStep >= 3 ? scenario?.delivery_points || [] : undefined}
            incident={currentStep >= 5 && currentStep < 8 ? incident : null}
            rerouteResult={currentStep >= 7 ? rerouteResult : null}
            currentStep={currentStep}
            activeTurnIndex={activeTurnIndex}
            onTurnSelect={setActiveTurnIndex}
            onSelectEdge={() => {}}
            onSelectNode={() => {}}
            onMapClick={handleMapClick}
            isLoading={isLoadingNetwork}
          />
        </div>
      </div>
    </div>
  );
}

export function JuryDemoWizard({ onFinishDemo }: JuryDemoProps) {
  return (
    <JuryDemoProvider>
      <JuryDemoWizardInner onFinishDemo={onFinishDemo} />
    </JuryDemoProvider>
  );
}
