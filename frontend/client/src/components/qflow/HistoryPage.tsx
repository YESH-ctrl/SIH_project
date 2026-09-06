import React from "react";
import { QFlowDataStore } from "@/data/qflowData";
import { History, Cpu, CheckCircle2, Clock } from "lucide-react";

export function HistoryPage() {
  return (
    <div className="space-y-4 font-sans text-white">
      <div className="pb-2 border-b border-slate-800">
        <h1 className="text-xl font-bold font-mono text-white tracking-tight uppercase flex items-center">
          <History size={20} className="mr-2 text-sky-400" /> OPTIMIZATION RUN HISTORY
        </h1>
        <p className="text-xs text-slate-400 font-sans">
          Historical log of cold-start and warm-start QPSO solver executions on Rajpur Network.
        </p>
      </div>

      <div className="bg-[#0d1015] border border-slate-800 p-4 font-mono text-xs space-y-3">
        <div className="flex items-center justify-between border-b border-slate-800 pb-2">
          <span className="font-bold text-white uppercase tracking-wider">HISTORICAL RUN LOGS</span>
          <span className="text-[10px] text-slate-400">3 RECORDED RUNS</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-[11px]">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400 uppercase text-[9px]">
                <th className="py-2.5 px-3">RUN ID</th>
                <th className="py-2.5 px-3">TIMESTAMP</th>
                <th className="py-2.5 px-3">VEHICLES</th>
                <th className="py-2.5 px-3">CUSTOMERS</th>
                <th className="py-2.5 px-3">ALGORITHM MODE</th>
                <th className="py-2.5 px-3">FITNESS</th>
                <th className="py-2.5 px-3">RUNTIME</th>
                <th className="py-2.5 px-3">TIME SAVED</th>
                <th className="py-2.5 px-3">STATUS</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {QFlowDataStore.history.map((run) => (
                <tr key={run.id} className="hover:bg-slate-900/80 transition-colors">
                  <td className="py-2.5 px-3 font-bold text-sky-400">{run.id}</td>
                  <td className="py-2.5 px-3 text-slate-300">{run.date}</td>
                  <td className="py-2.5 px-3 text-slate-300">{run.vehiclesCount}</td>
                  <td className="py-2.5 px-3 text-slate-300">{run.customersCount}</td>
                  <td className="py-2.5 px-3 text-slate-200 font-semibold">{run.algorithm}</td>
                  <td className="py-2.5 px-3 font-bold text-emerald-400">{run.fitness}</td>
                  <td className="py-2.5 px-3 text-slate-300">{run.runtimeSec} s</td>
                  <td className="py-2.5 px-3 text-emerald-400 font-bold">+{run.travelTimeSavedPercent}%</td>
                  <td className="py-2.5 px-3 text-emerald-400 flex items-center">
                    <CheckCircle2 size={12} className="mr-1" /> {run.status}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
