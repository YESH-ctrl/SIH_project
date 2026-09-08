import React, { useState } from "react";
import { getAnalystDashboardData } from "@/services/dashboardService";
import {
  BarChart3,
  TrendingUp,
  Award,
  Zap,
  Activity,
  Download,
  Calendar,
  FileText,
  Clock,
  Layers,
  ArrowUpRight,
  Sparkles,
} from "lucide-react";

interface AnalystDashboardProps {
  onNavigate: (tab: string) => void;
}

export function AnalystDashboard({ onNavigate }: AnalystDashboardProps) {
  const data = getAnalystDashboardData();
  const [timeRange, setTimeRange] = useState<"Today" | "7D" | "30D">("Today");

  return (
    <div className="space-y-6 font-sans">
      {/* Header Banner */}
      <div className="p-5 bg-[#0d0d0d] border border-neutral-800 flex flex-col md:flex-row md:items-center justify-between gap-4 relative overflow-hidden">
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-[#c8ff00] via-emerald-400 to-amber-400" />
        <div>
          <div className="flex items-center space-x-2 mb-1 font-mono text-xs text-[#c8ff00] uppercase tracking-wider font-semibold">
            <BarChart3 size={14} />
            <span>OPERATIONAL ANALYTICS & ALGORITHM RESEARCH WORKSPACE</span>
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight font-mono">
            Transportation Intelligence & Benchmark Analysis
          </h1>
          <p className="text-xs text-neutral-400 mt-1">
            Historical optimization evaluation, QPSO convergence metrics, and multi-algorithm benchmark comparisons.
          </p>
        </div>

        {/* Time Range & Export Actions */}
        <div className="flex items-center space-x-3 font-mono text-xs">
          <div className="flex bg-[#141414] border border-neutral-800 p-0.5">
            {(["Today", "7D", "30D"] as const).map((range) => (
              <button
                key={range}
                onClick={() => setTimeRange(range)}
                className={`px-3 py-1 text-xs font-bold transition-all ${
                  timeRange === range
                    ? "bg-[#c8ff00] text-black"
                    : "text-neutral-400 hover:text-white"
                }`}
              >
                {range}
              </button>
            ))}
          </div>

          <button
            onClick={() => alert("Exporting Operational Analytics Report (PDF/CSV)...")}
            className="px-3.5 py-2 bg-[#c8ff00] hover:bg-[#b5e600] text-black font-bold uppercase tracking-wider transition-all flex items-center space-x-1.5 shadow-lg shadow-[#c8ff00]/10"
          >
            <Download size={14} />
            <span>EXPORT REPORT</span>
          </button>
        </div>
      </div>


      {/* Top Analytical KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-3 font-mono">
        <div className="bg-[#0b0c0e] border border-slate-800 p-3.5 flex flex-col justify-between">
          <span className="text-[10px] text-slate-400 uppercase">AVG TRAVEL TIME</span>
          <div className="text-xl font-bold text-white mt-1">{data.avgTravelTimeMin} <span className="text-xs">min</span></div>
          <span className="text-[9px] text-emerald-400 mt-1">-18.4% Saved</span>
        </div>

        <div className="bg-[#0b0c0e] border border-slate-800 p-3.5 flex flex-col justify-between">
          <span className="text-[10px] text-slate-400 uppercase">AVG DISTANCE</span>
          <div className="text-xl font-bold text-sky-400 mt-1">{data.avgRouteDistanceKm} <span className="text-xs">km</span></div>
          <span className="text-[9px] text-emerald-400 mt-1">-14.2% Shorter</span>
        </div>

        <div className="bg-[#0b0c0e] border border-slate-800 p-3.5 flex flex-col justify-between">
          <span className="text-[10px] text-slate-400 uppercase">ON-TIME DELIVERY</span>
          <div className="text-xl font-bold text-emerald-400 mt-1">{data.onTimeDeliveryPercent}%</div>
          <span className="text-[9px] text-emerald-400 mt-1">+6.2% Target</span>
        </div>

        <div className="bg-[#0b0c0e] border border-slate-800 p-3.5 flex flex-col justify-between">
          <span className="text-[10px] text-slate-400 uppercase">AVG CONGESTION</span>
          <div className="text-xl font-bold text-amber-400 mt-1">{data.avgNetworkCongestionPercent}%</div>
          <span className="text-[9px] text-amber-400 mt-1">Urban Peak</span>
        </div>

        <div className="bg-[#0b0c0e] border border-slate-800 p-3.5 flex flex-col justify-between">
          <span className="text-[10px] text-slate-400 uppercase">FLEET UTILIZATION</span>
          <div className="text-xl font-bold text-purple-400 mt-1">{data.fleetUtilizationPercent}%</div>
          <span className="text-[9px] text-purple-400 mt-1">High Efficiency</span>
        </div>

        <div className="bg-[#0b0c0e] border border-slate-800 p-3.5 flex flex-col justify-between">
          <span className="text-[10px] text-slate-400 uppercase">QPSO GAIN</span>
          <div className="text-xl font-bold text-emerald-400 mt-1">+{data.optimizationImprovementPercent}%</div>
          <span className="text-[9px] text-emerald-400 mt-1">vs Baseline</span>
        </div>

        <div className="bg-[#0b0c0e] border border-slate-800 p-3.5 flex flex-col justify-between">
          <span className="text-[10px] text-slate-400 uppercase">SOLVER RUNTIME</span>
          <div className="text-xl font-bold text-sky-400 mt-1">{data.avgOptimizationTimeSec} <span className="text-xs">sec</span></div>
          <span className="text-[9px] text-sky-400 mt-1">Ultra-Fast</span>
        </div>

        <div className="bg-[#0b0c0e] border border-slate-800 p-3.5 flex flex-col justify-between">
          <span className="text-[10px] text-slate-400 uppercase">REOPTIMIZATIONS</span>
          <div className="text-xl font-bold text-amber-400 mt-1">{data.reoptimizationCount}</div>
          <span className="text-[9px] text-slate-500 mt-1">Dynamic Reroutes</span>
        </div>
      </div>

      {/* Main Grid: Algorithm Benchmark Comparison & QPSO Convergence */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 font-mono">
        {/* Left: Algorithm Benchmark Comparison Matrix (7 Columns) */}
        <div className="lg:col-span-7 bg-[#0b0c0e] border border-slate-800 p-5">
          <div className="flex items-center justify-between mb-4 border-b border-slate-800 pb-3">
            <h2 className="text-sm font-bold text-white uppercase tracking-wider flex items-center">
              <Award size={16} className="text-amber-400 mr-2" />
              ALGORITHM BENCHMARK MATRIX (SIMULATION DEMO DATA)
            </h2>
            <span className="text-[10px] bg-slate-800 text-slate-300 px-2 py-0.5 border border-slate-700">
              40 VEHICLES / 300 STOPS
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400 uppercase text-[10px] bg-slate-900/60">
                  <th className="py-2.5 px-3">ALGORITHM</th>
                  <th className="py-2.5 px-3">BEST FITNESS</th>
                  <th className="py-2.5 px-3">TIME SAVED (%)</th>
                  <th className="py-2.5 px-3">DISTANCE (KM)</th>
                  <th className="py-2.5 px-3">SOLVER RUNTIME</th>
                  <th className="py-2.5 px-3">CONVERGENCE</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {data.algorithmBenchmarks.map((bm, idx) => (
                  <tr
                    key={idx}
                    className={`hover:bg-slate-900/50 transition-colors ${
                      bm.algorithm.includes("QPSO") ? "bg-emerald-950/20 text-emerald-300 font-bold border-l-2 border-emerald-400" : "text-slate-300"
                    }`}
                  >
                    <td className="py-3 px-3 flex items-center space-x-1.5">
                      {bm.algorithm.includes("QPSO") && <Sparkles size={13} className="text-emerald-400" />}
                      <span>{bm.algorithm}</span>
                    </td>
                    <td className="py-3 px-3">{bm.bestFitness}</td>
                    <td className="py-3 px-3 text-emerald-400 font-bold">+{bm.travelTimeSavedPercent}%</td>
                    <td className="py-3 px-3">{bm.avgDistanceKm} km</td>
                    <td className="py-3 px-3 text-sky-400">{bm.avgRuntimeSec} s</td>
                    <td className="py-3 px-3 text-[10px] text-slate-400">{bm.convergenceRate}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mt-4 p-3 bg-slate-900/40 border border-slate-800 text-[11px] text-slate-400 flex items-center justify-between">
            <span>Notice: Algorithm comparison evaluated across 50 iterations under identical Rajpur network conditions.</span>
            <button
              onClick={() => onNavigate("algorithm-benchmark")}
              className="text-emerald-400 hover:text-emerald-300 font-bold uppercase flex items-center space-x-1"
            >
              <span>FULL BENCHMARK</span>
              <ArrowUpRight size={13} />
            </button>
          </div>
        </div>

        {/* Right: QPSO Convergence Curve Analytics (5 Columns) */}
        <div className="lg:col-span-5 bg-[#0b0c0e] border border-slate-800 p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <h2 className="text-sm font-bold text-white uppercase tracking-wider flex items-center">
              <Zap size={16} className="text-emerald-400 mr-2" />
              QPSO SOLVER CONVERGENCE Analytics
            </h2>
            <span className="text-[10px] text-emerald-400 font-bold">50 ITERATIONS</span>
          </div>

          {/* Simple Visual Convergence Curve Representation */}
          <div className="space-y-3 text-xs">
            <div className="text-slate-400 text-[11px]">FITNESS DECAY PROGRESSION OVER ITERATIONS</div>
            <div className="space-y-2">
              {data.qpsoAnalytics.convergenceCurve.map((step) => (
                <div key={step.iteration} className="flex items-center space-x-3 text-[11px]">
                  <span className="w-12 text-slate-500 font-mono">Iter {step.iteration}</span>
                  <div className="flex-1 bg-slate-900 h-3 border border-slate-800 relative">
                    <div
                      className="bg-emerald-400 h-3 transition-all"
                      style={{ width: `${(1 - (step.qpso - 1200) / 1200) * 100}%` }}
                    />
                  </div>
                  <span className="w-16 text-right font-bold text-emerald-400 font-mono">{step.qpso}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="p-3 bg-slate-900/60 border border-slate-800 grid grid-cols-2 gap-3 text-xs font-mono">
            <div>
              <div className="text-[10px] text-slate-400 uppercase">BEST SOLUTION SCORE</div>
              <div className="text-base font-bold text-emerald-400">{data.qpsoAnalytics.bestFitness}</div>
            </div>
            <div>
              <div className="text-[10px] text-slate-400 uppercase">POPULATION SIZE</div>
              <div className="text-base font-bold text-sky-400">{data.qpsoAnalytics.populationSize} Swarm Particles</div>
            </div>
          </div>
        </div>
      </div>

      {/* Traffic Analytics & Optimization History */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 font-mono">
        {/* Zone Congestion Analytics (6 Columns) */}
        <div className="lg:col-span-6 bg-[#0b0c0e] border border-slate-800 p-5">
          <h2 className="text-sm font-bold text-white uppercase tracking-wider mb-4 flex items-center">
            <Activity size={16} className="text-sky-400 mr-2" />
            TRAFFIC CONGESTION BY URBAN ZONE
          </h2>

          <div className="space-y-3 text-xs">
            {data.trafficAnalytics.congestionByZone.map((z, idx) => (
              <div key={idx}>
                <div className="flex justify-between text-slate-300 mb-1">
                  <span>{z.zone}</span>
                  <span className={`font-bold ${z.congestion > 60 ? "text-red-400" : z.congestion > 40 ? "text-amber-400" : "text-emerald-400"}`}>
                    {z.congestion}% Congested
                  </span>
                </div>
                <div className="w-full bg-slate-900 h-2 border border-slate-800">
                  <div
                    className={`h-2 ${z.congestion > 60 ? "bg-red-500" : z.congestion > 40 ? "bg-amber-400" : "bg-emerald-400"}`}
                    style={{ width: `${z.congestion}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Optimization History Run Log (6 Columns) */}
        <div className="lg:col-span-6 bg-[#0b0c0e] border border-slate-800 p-5">
          <h2 className="text-sm font-bold text-white uppercase tracking-wider mb-4 flex items-center">
            <Clock size={16} className="text-purple-400 mr-2" />
            OPTIMIZATION SOLVER HISTORY
          </h2>

          <div className="divide-y divide-slate-800 text-xs">
            {data.optimizationHistory.map((run) => (
              <div key={run.runId} className="py-2.5 flex items-center justify-between">
                <div>
                  <div className="font-bold text-white">{run.runId}</div>
                  <div className="text-[10px] text-slate-400">{run.algorithm} • {run.vehicles} Vehicles • {run.stops} Stops</div>
                </div>
                <div className="text-right">
                  <div className="font-bold text-emerald-400">Score: {run.fitness}</div>
                  <div className="text-[10px] text-slate-500">{run.date} ({run.runtimeSec}s)</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
