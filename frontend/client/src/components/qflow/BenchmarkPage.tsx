import React from "react";
import { QFlowDataStore, BenchmarkResult } from "@/data/qflowData";
import { Sliders, Cpu, CheckCircle2, Trophy, Zap, TrendingDown } from "lucide-react";

export function BenchmarkPage() {
  return (
    <div className="space-y-4 font-sans text-white">
      {/* Title */}
      <div className="pb-2 border-b border-slate-800">
        <h1 className="text-xl font-bold font-mono text-white tracking-tight uppercase flex items-center">
          <Sliders size={20} className="mr-2 text-sky-400" /> ALGORITHM BENCHMARK MATRIX
        </h1>
        <p className="text-xs text-slate-400 font-sans">
          Evaluate routing performance and convergence speeds across metaheuristic solvers on the Rajpur Urban Model.
        </p>
      </div>

      {/* Highlights Banner */}
      <div className="p-4 bg-[#0d1015] border border-slate-800 font-mono text-xs space-y-2">
        <div className="text-[10px] text-sky-400 font-bold uppercase tracking-wider flex items-center">
          <Trophy size={13} className="mr-1 text-amber-400" /> BENCHMARK EVALUATION SUMMARY
        </div>
        <p className="text-slate-300 text-xs font-sans">
          Quantum-Inspired Particle Swarm Optimization (QPSO) demonstrates <strong>21.8% travel time savings</strong> vs Dijkstra baseline, achieving 100% route constraint feasibility in <strong>8.4s execution time</strong>.
        </p>
      </div>

      {/* Benchmark Metrics Comparison Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Travel Time Comparison Chart */}
        <div className="bg-[#0d1015] border border-slate-800 p-4 font-mono text-xs space-y-3">
          <div className="text-[10px] text-slate-400 font-bold uppercase flex justify-between">
            <span>SYSTEM TRAVEL TIME (LOWER IS BETTER)</span>
            <span className="text-emerald-400">MINUTES</span>
          </div>

          <div className="space-y-2">
            {QFlowDataStore.benchmarks.map((b) => (
              <div key={b.algorithm} className="space-y-1">
                <div className="flex justify-between text-[11px]">
                  <span className={b.isQPSO ? "font-bold text-emerald-400 flex items-center" : "text-slate-300"}>
                    {b.algorithm} — {b.fullName}
                  </span>
                  <span className={b.isQPSO ? "font-bold text-emerald-400" : "text-white"}>
                    {b.travelTimeMin} min
                  </span>
                </div>
                <div className="w-full h-3 bg-slate-900 border border-slate-800 overflow-hidden">
                  <div
                    className={`h-full transition-all ${b.isQPSO ? "bg-emerald-500" : "bg-slate-700"}`}
                    style={{ width: `${(b.travelTimeMin / 400) * 100}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Runtime Comparison Chart */}
        <div className="bg-[#0d1015] border border-slate-800 p-4 font-mono text-xs space-y-3">
          <div className="text-[10px] text-slate-400 font-bold uppercase flex justify-between">
            <span>SOLVER RUNTIME (LOWER IS BETTER)</span>
            <span className="text-sky-400">SECONDS</span>
          </div>

          <div className="space-y-2">
            {QFlowDataStore.benchmarks.map((b) => (
              <div key={b.algorithm} className="space-y-1">
                <div className="flex justify-between text-[11px]">
                  <span className={b.isQPSO ? "font-bold text-sky-400 flex items-center" : "text-slate-300"}>
                    {b.algorithm}
                  </span>
                  <span className={b.isQPSO ? "font-bold text-sky-400" : "text-white"}>
                    {b.runtimeSec} s
                  </span>
                </div>
                <div className="w-full h-3 bg-slate-900 border border-slate-800 overflow-hidden">
                  <div
                    className={`h-full transition-all ${b.isQPSO ? "bg-sky-500" : "bg-slate-700"}`}
                    style={{ width: `${(b.runtimeSec / 30) * 100}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Benchmark Full Table */}
      <div className="bg-[#0d1015] border border-slate-800 p-4 font-mono text-xs space-y-3">
        <div className="flex items-center justify-between border-b border-slate-800 pb-2">
          <span className="font-bold text-white uppercase tracking-wider">FULL ALGORITHM BENCHMARK MATRIX</span>
          <span className="text-[10px] text-slate-400">RAJPUR 40-VEHICLE VRP MODEL</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-[11px]">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400 uppercase text-[9px]">
                <th className="py-2.5 px-3">ALGORITHM</th>
                <th className="py-2.5 px-3">TRAVEL TIME</th>
                <th className="py-2.5 px-3">DISTANCE</th>
                <th className="py-2.5 px-3">SOLVER RUNTIME</th>
                <th className="py-2.5 px-3">CONVERGENCE ITER</th>
                <th className="py-2.5 px-3">FEASIBILITY</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {QFlowDataStore.benchmarks.map((b) => (
                <tr
                  key={b.algorithm}
                  className={b.isQPSO ? "bg-emerald-500/10 text-white font-bold" : "text-slate-300"}
                >
                  <td className="py-2.5 px-3">
                    <span className={b.isQPSO ? "text-emerald-400 font-extrabold" : "text-white"}>
                      {b.algorithm}
                    </span>{" "}
                    <span className="text-slate-400 text-[10px]">({b.fullName})</span>
                  </td>
                  <td className="py-2.5 px-3">{b.travelTimeMin} min</td>
                  <td className="py-2.5 px-3">{b.distanceKm} km</td>
                  <td className="py-2.5 px-3">{b.runtimeSec} s</td>
                  <td className="py-2.5 px-3">{b.convergenceIteration} iter</td>
                  <td className="py-2.5 px-3 text-emerald-400">{b.feasibilityRatePercent}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
