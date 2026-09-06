import React from "react";
import { QFlowDataStore } from "@/data/qflowData";
import { LiveOperationsMap } from "./LiveOperationsMap";
import { Activity, Gauge, TrendingUp, AlertTriangle, Layers, Clock } from "lucide-react";

export function TrafficIntelligencePage() {
  return (
    <div className="space-y-4 font-sans text-white">
      {/* Title */}
      <div className="pb-2 border-b border-slate-800">
        <h1 className="text-xl font-bold font-mono text-white tracking-tight uppercase flex items-center">
          <Activity size={20} className="mr-2 text-amber-400" /> TRAFFIC INTELLIGENCE ENGINE
        </h1>
        <p className="text-xs text-slate-400 font-sans">
          Understand current and predicted transportation network conditions across Rajpur Urban Network.
        </p>
      </div>

      {/* Top KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 font-mono text-xs">
        <div className="p-3 bg-[#0d1015] border border-slate-800 space-y-1">
          <div className="flex items-center justify-between text-slate-400 text-[10px] uppercase font-semibold">
            <span>NETWORK SPEED</span>
            <Gauge size={14} className="text-emerald-400" />
          </div>
          <div className="text-2xl font-bold text-white">32 <span className="text-xs font-normal text-slate-400">km/h</span></div>
          <div className="text-[10px] text-emerald-400">Free Flow 42 km/h</div>
        </div>

        <div className="p-3 bg-[#0d1015] border border-slate-800 space-y-1">
          <div className="flex items-center justify-between text-slate-400 text-[10px] uppercase font-semibold">
            <span>TRAFFIC FLOW</span>
            <Activity size={14} className="text-sky-400" />
          </div>
          <div className="text-2xl font-bold text-white">1,240 <span className="text-xs font-normal text-slate-400">veh/h</span></div>
          <div className="text-[10px] text-slate-400">Peak Capacity 1,500</div>
        </div>

        <div className="p-3 bg-[#0d1015] border border-slate-800 space-y-1">
          <div className="flex items-center justify-between text-slate-400 text-[10px] uppercase font-semibold">
            <span>CONGESTED SEGMENTS</span>
            <AlertTriangle size={14} className="text-amber-400" />
          </div>
          <div className="text-2xl font-bold text-amber-400">18</div>
          <div className="text-[10px] text-amber-400">E17 Severe Delay</div>
        </div>

        <div className="p-3 bg-[#0d1015] border border-slate-800 space-y-1">
          <div className="flex items-center justify-between text-slate-400 text-[10px] uppercase font-semibold">
            <span>PREDICTED CONGESTION</span>
            <TrendingUp size={14} className="text-indigo-400" />
          </div>
          <div className="text-2xl font-bold text-indigo-400">MODERATE</div>
          <div className="text-[10px] text-indigo-400">15-min horizon</div>
        </div>
      </div>

      {/* Main Grid: Map & Traffic Analytics */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Large Traffic Network Map */}
        <div className="lg:col-span-8 h-[480px]">
          <LiveOperationsMap />
        </div>

        {/* Right Details: Current & Predicted Traffic State */}
        <div className="lg:col-span-4 bg-[#0d1015] border border-slate-800 p-4 font-mono text-xs space-y-4">
          <div className="border-b border-slate-800 pb-2 flex justify-between items-center">
            <span className="font-bold text-white uppercase tracking-wider">CURRENT VS PREDICTED</span>
            <span className="text-[10px] text-emerald-400">SUMO MODEL</span>
          </div>

          {/* Current Conditions */}
          <div className="space-y-2">
            <div className="text-[10px] text-slate-400 font-bold uppercase">CURRENT CONDITIONS</div>
            <div className="grid grid-cols-2 gap-2 text-[11px]">
              <div className="p-2 bg-slate-900 border border-slate-800">
                <span className="text-slate-400 block text-[9px]">AVG SPEED</span>
                <span className="font-bold text-white">32 km/h</span>
              </div>
              <div className="p-2 bg-slate-900 border border-slate-800">
                <span className="text-slate-400 block text-[9px]">FLOW DENSITY</span>
                <span className="font-bold text-slate-200">48 veh/km</span>
              </div>
              <div className="p-2 bg-slate-900 border border-slate-800">
                <span className="text-slate-400 block text-[9px]">CONGESTION INDEX</span>
                <span className="font-bold text-amber-400">0.38</span>
              </div>
              <div className="p-2 bg-slate-900 border border-slate-800">
                <span className="text-slate-400 block text-[9px]">CRITICAL ROAD</span>
                <span className="font-bold text-red-400">Express E17</span>
              </div>
            </div>
          </div>

          {/* Predicted Horizon */}
          <div className="space-y-2">
            <div className="text-[10px] text-slate-400 font-bold uppercase">PREDICTED HORIZON</div>
            <div className="space-y-1.5 text-[11px]">
              <div className="flex justify-between p-2 bg-slate-900 border border-slate-800">
                <span className="text-slate-400">5-min Horizon:</span>
                <span className="text-emerald-400 font-bold">Stable (33 km/h)</span>
              </div>
              <div className="flex justify-between p-2 bg-slate-900 border border-slate-800">
                <span className="text-slate-400">10-min Horizon:</span>
                <span className="text-amber-400 font-bold font-mono">+12% Congestion on E17</span>
              </div>
              <div className="flex justify-between p-2 bg-slate-900 border border-slate-800">
                <span className="text-slate-400">15-min Horizon:</span>
                <span className="text-indigo-400 font-bold">Warm Start Trigger Threshold</span>
              </div>
            </div>
          </div>

          {/* Chart: Predicted vs Actual Travel Time */}
          <div className="space-y-1 pt-2">
            <div className="text-[10px] text-slate-400 font-bold uppercase flex items-center justify-between">
              <span>PREDICTED VS ACTUAL TRAVEL TIME</span>
              <span className="text-sky-400">98.2% Accuracy</span>
            </div>
            <div className="h-32 bg-slate-950 border border-slate-800 p-2 flex items-end justify-between gap-2">
              {[
                { time: "08:00", pred: 24, act: 25 },
                { time: "08:15", pred: 28, act: 27 },
                { time: "08:30", pred: 35, act: 36 },
                { time: "08:45", pred: 42, act: 44 },
                { time: "09:00", pred: 38, act: 37 },
              ].map((d, idx) => (
                <div key={idx} className="flex-1 flex flex-col items-center gap-1 h-full justify-end">
                  <div className="w-full flex items-end justify-center gap-1 h-full">
                    <div
                      className="w-1/2 bg-sky-500 rounded-t-none"
                      style={{ height: `${d.pred * 2}%` }}
                      title={`Predicted: ${d.pred} min`}
                    />
                    <div
                      className="w-1/2 bg-emerald-500 rounded-t-none"
                      style={{ height: `${d.act * 2}%` }}
                      title={`Actual: ${d.act} min`}
                    />
                  </div>
                  <span className="text-[8px] text-slate-400">{d.time}</span>
                </div>
              ))}
            </div>
            <div className="flex justify-center space-x-4 text-[9px] text-slate-400 pt-1">
              <span className="flex items-center"><span className="w-2 h-2 bg-sky-500 mr-1" /> Predicted Time</span>
              <span className="flex items-center"><span className="w-2 h-2 bg-emerald-500 mr-1" /> Actual Time</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
