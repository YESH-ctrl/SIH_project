import React, { useState, useEffect } from "react";
import { QFlowDataStore, Vehicle } from "@/data/qflowData";
import { LiveOperationsMap } from "./LiveOperationsMap";
import { Button } from "@/components/ui/button";
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
} from "lucide-react";

export function RouteOptimizationPage() {
  const [isRunning, setIsRunning] = useState(false);
  const [isCompleted, setIsCompleted] = useState(false);
  const [iteration, setIteration] = useState(0);
  const maxIterations = 150;
  const [bestFitnessHistory, setBestFitnessHistory] = useState<number[]>([]);
  const [selectedRouteVehicle, setSelectedRouteVehicle] = useState<Vehicle | null>(null);

  // Advanced solver parameters
  const [popSize, setPopSize] = useState(50);
  const [maxIter, setMaxIter] = useState(150);
  const [trafficModel, setTrafficModel] = useState("Predicted Traffic");

  const startOptimization = () => {
    setIsRunning(true);
    setIsCompleted(false);
    setIteration(0);
    setBestFitnessHistory([22000]);
  };

  useEffect(() => {
    let interval: any;
    if (isRunning && iteration < maxIterations) {
      interval = setInterval(() => {
        setIteration((prev) => {
          const next = prev + 5;
          if (next >= maxIterations) {
            setIsRunning(false);
            setIsCompleted(true);
            return maxIterations;
          }
          return next;
        });

        setBestFitnessHistory((prev) => {
          const last = prev[prev.length - 1] || 22000;
          const drop = Math.floor(Math.random() * 600 + 200);
          return [...prev, Math.max(12483, last - drop)];
        });
      }, 120);
    }
    return () => clearInterval(interval);
  }, [isRunning, iteration]);

  const pipelineStages = [
    { label: "NETWORK", status: iteration > 10 ? "done" : isRunning ? "active" : "pending" },
    { label: "TRAFFIC", status: iteration > 30 ? "done" : iteration > 10 ? "active" : "pending" },
    { label: "VRP", status: iteration > 50 ? "done" : iteration > 30 ? "active" : "pending" },
    { label: "QPSO", status: iteration > 90 ? "done" : iteration > 50 ? "active" : "pending" },
    { label: "CONSTRAINTS", status: iteration > 120 ? "done" : iteration > 90 ? "active" : "pending" },
    { label: "CONGESTION", status: iteration >= 140 ? "done" : iteration > 120 ? "active" : "pending" },
    { label: "DISPATCH", status: isCompleted ? "done" : iteration >= 140 ? "active" : "pending" },
  ];

  return (
    <div className="space-y-4 font-sans text-white">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-800">
        <div>
          <h1 className="text-xl font-bold font-mono text-white tracking-tight uppercase flex items-center">
            <Cpu size={20} className="mr-2 text-sky-400" /> ROUTE OPTIMIZATION ENGINE
          </h1>
          <p className="text-xs text-slate-400 font-sans">
            Generate coordinated fleet routes using network conditions and operational constraints (QPSO Engine).
          </p>
        </div>

        {isCompleted && (
          <Button
            onClick={startOptimization}
            variant="outline"
            className="border-slate-700 bg-slate-800 hover:bg-slate-700 text-white font-mono text-xs rounded-none"
          >
            <RotateCcw size={13} className="mr-1.5" /> RE-RUN SOLVER
          </Button>
        )}
      </div>

      {/* Horizontal Pipeline View */}
      <div className="p-3 bg-[#0d1015] border border-slate-800 font-mono text-xs overflow-x-auto">
        <div className="text-[10px] text-slate-400 uppercase font-semibold mb-2 flex items-center">
          <Layers size={12} className="mr-1 text-sky-400" /> OPTIMIZATION PIPELINE STAGES
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
        {/* Left Side: Configuration OR Live Progress */}
        <div className="lg:col-span-5 space-y-4">
          {!isRunning && !isCompleted && (
            <div className="bg-[#0d1015] border border-slate-800 p-5 font-mono text-xs space-y-5">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                <span className="font-bold text-white uppercase tracking-wider">SOLVER CONFIGURATION</span>
                <span className="text-[10px] text-sky-400">RAJPUR MODEL</span>
              </div>

              {/* Input Specs */}
              <div className="grid grid-cols-2 gap-3 text-[11px]">
                <div className="p-2 bg-slate-900 border border-slate-800">
                  <span className="text-slate-400 block text-[9px] uppercase">NETWORK</span>
                  <span className="font-bold text-white">Rajpur Urban Network</span>
                </div>
                <div className="p-2 bg-slate-900 border border-slate-800">
                  <span className="text-slate-400 block text-[9px] uppercase">FLEET SIZE</span>
                  <span className="font-bold text-white">40 Vehicles</span>
                </div>
                <div className="p-2 bg-slate-900 border border-slate-800">
                  <span className="text-slate-400 block text-[9px] uppercase">DELIVERIES</span>
                  <span className="font-bold text-white">300 Customer Stops</span>
                </div>
                <div className="p-2 bg-slate-900 border border-slate-800">
                  <span className="text-slate-400 block text-[9px] uppercase">DEPOTS</span>
                  <span className="font-bold text-white">3 Central Depots</span>
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
                    <ShieldCheck size={13} className="mr-1" /> Time Windows
                  </div>
                  <div className="flex items-center text-emerald-400">
                    <ShieldCheck size={13} className="mr-1" /> Road Restrictions
                  </div>
                  <div className="flex items-center text-emerald-400">
                    <ShieldCheck size={13} className="mr-1" /> Axle & Heavy Limits
                  </div>
                </div>
              </div>

              {/* Optimization Engine Info */}
              <div className="p-3 bg-slate-900 border border-slate-800 space-y-2">
                <div className="text-[10px] text-sky-400 font-bold uppercase">OPTIMIZATION ENGINE</div>
                <div className="font-bold text-white text-xs">
                  Quantum-Inspired Particle Swarm Optimization (QPSO)
                </div>
                <p className="text-[10px] text-slate-400 font-sans leading-relaxed">
                  Discrete multi-swarm solver with warm-start capability for real-time congestion avoidance.
                </p>
              </div>

              {/* Parameters */}
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="text-[9px] text-slate-400 uppercase block mb-1">POPULATION</label>
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
                <div>
                  <label className="text-[9px] text-slate-400 uppercase block mb-1">CONVERGENCE</label>
                  <div className="p-1.5 bg-slate-900 border border-slate-800 text-[10px] text-emerald-400 text-center font-bold">
                    0.001
                  </div>
                </div>
              </div>

              <Button
                onClick={startOptimization}
                className="w-full bg-emerald-500 hover:bg-emerald-600 text-black font-bold uppercase py-3 rounded-none text-xs flex items-center justify-center space-x-2 shadow-lg"
              >
                <Play size={15} />
                <span>START OPTIMIZATION SOLVER</span>
              </Button>
            </div>
          )}

          {/* Active Optimization Progress Screen */}
          {isRunning && (
            <div className="bg-[#0d1015] border border-slate-800 p-5 font-mono text-xs space-y-4">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                <span className="font-bold text-sky-400 uppercase tracking-wider flex items-center">
                  <span className="w-2 h-2 rounded-full bg-sky-400 mr-2 animate-ping" /> OPTIMIZATION IN PROGRESS
                </span>
                <span className="text-slate-400">QPSO ACTIVE</span>
              </div>

              {/* Progress Bar */}
              <div className="space-y-1">
                <div className="flex justify-between text-[11px]">
                  <span className="text-slate-400">PROGRESS</span>
                  <span className="font-bold text-white">{Math.round((iteration / maxIterations) * 100)}%</span>
                </div>
                <div className="w-full h-2 bg-slate-900 border border-slate-800 overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-sky-500 to-emerald-400 transition-all duration-200"
                    style={{ width: `${(iteration / maxIterations) * 100}%` }}
                  />
                </div>
              </div>

              {/* Real-time Metrics Grid */}
              <div className="grid grid-cols-2 gap-3 text-[11px]">
                <div className="p-2.5 bg-slate-900 border border-slate-800">
                  <span className="text-slate-400 block text-[9px] uppercase">ITERATION</span>
                  <span className="text-xl font-bold text-white">{iteration} / {maxIterations}</span>
                </div>
                <div className="p-2.5 bg-slate-900 border border-slate-800">
                  <span className="text-slate-400 block text-[9px] uppercase">SWARM POPULATION</span>
                  <span className="text-xl font-bold text-white">{popSize} Particles</span>
                </div>
                <div className="p-2.5 bg-slate-900 border border-slate-800">
                  <span className="text-slate-400 block text-[9px] uppercase">BEST FITNESS SCORE</span>
                  <span className="text-xl font-bold text-emerald-400">
                    {bestFitnessHistory[bestFitnessHistory.length - 1] || 12483}
                  </span>
                </div>
                <div className="p-2.5 bg-slate-900 border border-slate-800">
                  <span className="text-slate-400 block text-[9px] uppercase">FEASIBLE SOLUTIONS</span>
                  <span className="text-xl font-bold text-sky-400">47 / 50</span>
                </div>
              </div>

              {/* Status Message */}
              <div className="p-3 bg-slate-900/90 border border-slate-800 text-[10px] text-slate-300 flex items-center">
                <Cpu size={14} className="mr-2 text-sky-400 animate-spin" />
                Searching discrete solution space for optimal vehicle route assignments...
              </div>

              {/* Live Convergence Chart */}
              <div className="space-y-1 pt-2">
                <div className="flex justify-between text-[10px] text-slate-400 uppercase font-bold">
                  <span>CONVERGENCE CURVE (FITNESS VS ITERATION)</span>
                  <span className="text-emerald-400">-21.8% Cost</span>
                </div>
                <div className="h-32 bg-slate-950 border border-slate-800 p-2 flex items-end justify-between gap-1">
                  {bestFitnessHistory.slice(-20).map((score, i) => {
                    const h = Math.max(10, Math.min(100, ((22000 - score) / 10000) * 100));
                    return (
                      <div
                        key={i}
                        className="w-full bg-emerald-500/80 hover:bg-emerald-400 transition-all"
                        style={{ height: `${h}%` }}
                        title={`Iter: ${i * 7}, Score: ${score}`}
                      />
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* Completed Optimization Results Summary */}
          {isCompleted && (
            <div className="bg-[#0d1015] border border-slate-800 p-5 font-mono text-xs space-y-4">
              <div className="flex items-center space-x-2 text-emerald-400 font-bold border-b border-slate-800 pb-2">
                <CheckCircle2 size={18} />
                <span className="uppercase tracking-wider">OPTIMIZATION COMPLETE</span>
              </div>

              <div className="grid grid-cols-2 gap-3 text-[11px]">
                <div className="p-3 bg-slate-900 border border-slate-800">
                  <span className="text-slate-400 block text-[9px] uppercase">TOTAL TRAVEL TIME</span>
                  <span className="text-xl font-bold text-white">298.4 <span className="text-xs font-normal text-slate-400">min</span></span>
                  <span className="text-[9px] text-emerald-400 block mt-1">-21.8% Reduction</span>
                </div>

                <div className="p-3 bg-slate-900 border border-slate-800">
                  <span className="text-slate-400 block text-[9px] uppercase">TOTAL DISTANCE</span>
                  <span className="text-xl font-bold text-white">342.1 <span className="text-xs font-normal text-slate-400">km</span></span>
                  <span className="text-[9px] text-emerald-400 block mt-1">-14.2% Distance</span>
                </div>

                <div className="p-3 bg-slate-900 border border-slate-800">
                  <span className="text-slate-400 block text-[9px] uppercase">VEHICLES OPTIMIZED</span>
                  <span className="text-xl font-bold text-sky-400">40 / 40</span>
                </div>

                <div className="p-3 bg-slate-900 border border-slate-800">
                  <span className="text-slate-400 block text-[9px] uppercase">SOLVER RUNTIME</span>
                  <span className="text-xl font-bold text-emerald-400">8.4 <span className="text-xs font-normal text-slate-400">sec</span></span>
                </div>
              </div>

              <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 text-[11px] text-emerald-300">
                ✓ 40 Vehicles Coordinated • 300 Customer Stops Covered • 0 Constraint Violations
              </div>
            </div>
          )}
        </div>

        {/* Right Side: Map & Route Table */}
        <div className="lg:col-span-7 space-y-4">
          <div className="h-[360px]">
            <LiveOperationsMap
              selectedVehicle={selectedRouteVehicle}
              onSelectVehicle={(v) => setSelectedRouteVehicle(v)}
            />
          </div>

          {/* Optimized Route Details Table */}
          <div className="bg-[#0d1015] border border-slate-800 p-4 font-mono text-xs space-y-3">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <span className="font-bold text-white uppercase tracking-wider">OPTIMIZED FLEET ROUTES</span>
              <span className="text-[10px] text-slate-400">CLICK ROW TO HIGHLIGHT ROUTE</span>
            </div>

            <div className="overflow-x-auto max-h-[220px]">
              <table className="w-full text-left text-[11px]">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-400 uppercase text-[9px]">
                    <th className="py-2 px-2">VEHICLE</th>
                    <th className="py-2 px-2">ROUTE</th>
                    <th className="py-2 px-2">STOPS</th>
                    <th className="py-2 px-2">DISTANCE</th>
                    <th className="py-2 px-2">TIME</th>
                    <th className="py-2 px-2">LOAD</th>
                    <th className="py-2 px-2">STATUS</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {QFlowDataStore.vehicles.slice(0, 8).map((v) => {
                    const isSelected = selectedRouteVehicle?.id === v.id;
                    return (
                      <tr
                        key={v.id}
                        onClick={() => setSelectedRouteVehicle(v)}
                        className={`cursor-pointer transition-colors ${
                          isSelected ? "bg-sky-500/20 text-white font-bold" : "hover:bg-slate-900 text-slate-300"
                        }`}
                      >
                        <td className="py-2 px-2 font-bold text-sky-400">{v.id}</td>
                        <td className="py-2 px-2">{v.routeId}</td>
                        <td className="py-2 px-2">12 Stops</td>
                        <td className="py-2 px-2">18.4 km</td>
                        <td className="py-2 px-2">32 min</td>
                        <td className="py-2 px-2">{v.currentLoadKg} kg</td>
                        <td className="py-2 px-2 text-emerald-400 font-semibold">Optimized</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
