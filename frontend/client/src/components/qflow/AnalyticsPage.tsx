import React from "react";
import { BarChart3, Activity, Gauge, Cpu, TrendingUp } from "lucide-react";

export function AnalyticsPage() {
  return (
    <div className="space-y-4 font-sans text-white">
      <div className="pb-2 border-b border-slate-800">
        <h1 className="text-xl font-bold font-mono text-white tracking-tight uppercase flex items-center">
          <BarChart3 size={20} className="mr-2 text-sky-400" /> OPERATIONAL ANALYTICS CONTROL
        </h1>
        <p className="text-xs text-slate-400 font-sans">
          Historical fleet performance, network congestion metrics, and QPSO solver efficiency.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 font-mono text-xs">
        {/* Fleet Performance */}
        <div className="p-4 bg-[#0d1015] border border-slate-800 space-y-3">
          <div className="flex items-center space-x-2 text-sky-400 font-bold border-b border-slate-800 pb-2">
            <BarChart3 size={15} />
            <span className="uppercase">FLEET PERFORMANCE</span>
          </div>

          <div className="space-y-2 text-[11px]">
            <div className="flex justify-between p-2 bg-slate-900 border border-slate-800">
              <span className="text-slate-400">Total Travel Time:</span>
              <span className="font-bold text-white">298.4 min</span>
            </div>
            <div className="flex justify-between p-2 bg-slate-900 border border-slate-800">
              <span className="text-slate-400">Average Trip Duration:</span>
              <span className="font-bold text-white">28.2 min</span>
            </div>
            <div className="flex justify-between p-2 bg-slate-900 border border-slate-800">
              <span className="text-slate-400">Total Distance:</span>
              <span className="font-bold text-white">342.1 km</span>
            </div>
            <div className="flex justify-between p-2 bg-slate-900 border border-slate-800">
              <span className="text-slate-400">Payload Capacity Utilization:</span>
              <span className="font-bold text-emerald-400">92.4%</span>
            </div>
          </div>
        </div>

        {/* Traffic Performance */}
        <div className="p-4 bg-[#0d1015] border border-slate-800 space-y-3">
          <div className="flex items-center space-x-2 text-amber-400 font-bold border-b border-slate-800 pb-2">
            <Activity size={15} />
            <span className="uppercase">TRAFFIC PERFORMANCE</span>
          </div>

          <div className="space-y-2 text-[11px]">
            <div className="flex justify-between p-2 bg-slate-900 border border-slate-800">
              <span className="text-slate-400">Average Network Speed:</span>
              <span className="font-bold text-white">32 km/h</span>
            </div>
            <div className="flex justify-between p-2 bg-slate-900 border border-slate-800">
              <span className="text-slate-400">Network Congestion Index:</span>
              <span className="font-bold text-amber-400">0.38</span>
            </div>
            <div className="flex justify-between p-2 bg-slate-900 border border-slate-800">
              <span className="text-slate-400">Bottleneck Segments:</span>
              <span className="font-bold text-red-400">2 Segments (E17)</span>
            </div>
            <div className="flex justify-between p-2 bg-slate-900 border border-slate-800">
              <span className="text-slate-400">Average Flow Density:</span>
              <span className="font-bold text-white">48 veh/km</span>
            </div>
          </div>
        </div>

        {/* Optimization Performance */}
        <div className="p-4 bg-[#0d1015] border border-slate-800 space-y-3">
          <div className="flex items-center space-x-2 text-emerald-400 font-bold border-b border-slate-800 pb-2">
            <Cpu size={15} />
            <span className="uppercase">OPTIMIZATION PERFORMANCE</span>
          </div>

          <div className="space-y-2 text-[11px]">
            <div className="flex justify-between p-2 bg-slate-900 border border-slate-800">
              <span className="text-slate-400">Best Fitness Score:</span>
              <span className="font-bold text-emerald-400">12,483</span>
            </div>
            <div className="flex justify-between p-2 bg-slate-900 border border-slate-800">
              <span className="text-slate-400">Cold Start Solver Runtime:</span>
              <span className="font-bold text-white">8.4 sec</span>
            </div>
            <div className="flex justify-between p-2 bg-slate-900 border border-slate-800">
              <span className="text-slate-400">Warm Start Re-routing:</span>
              <span className="font-bold text-sky-400">2.1 sec</span>
            </div>
            <div className="flex justify-between p-2 bg-slate-900 border border-slate-800">
              <span className="text-slate-400">Constraint Feasibility:</span>
              <span className="font-bold text-emerald-400">100%</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
