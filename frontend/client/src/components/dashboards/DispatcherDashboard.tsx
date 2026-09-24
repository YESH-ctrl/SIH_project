import React, { useState } from "react";
import { getDispatcherDashboardData } from "@/services/dashboardService";
import { LiveOperationsMap } from "@/components/qflow/LiveOperationsMap";
import {
  Radio,
  Truck,
  AlertTriangle,
  RotateCcw,
  CheckCircle2,
  Clock,
  Navigation,
  MapPin,
  Play,
  Pause,
  ArrowRight,
  Zap,
  Activity,
  Layers,
  X,
} from "lucide-react";

interface DispatcherDashboardProps {
  onNavigate: (tab: string) => void;
  onTriggerIncidentDemo: () => void;
}

export function DispatcherDashboard({
  onNavigate,
  onTriggerIncidentDemo,
}: DispatcherDashboardProps) {
  const data = getDispatcherDashboardData();
  const [selectedVehicle, setSelectedVehicle] = useState<any | null>(null);

  return (
    <div className="space-y-5 font-sans">
      {/* Dispatch Telemetry Header */}
      <div className="p-4 bg-[#0d0d0d] border border-neutral-800 flex flex-col md:flex-row md:items-center justify-between gap-4 relative overflow-hidden">
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-[#c8ff00] via-emerald-400 to-amber-400" />
        <div>
          <div className="flex items-center space-x-2 mb-1 font-mono text-xs text-[#c8ff00] uppercase tracking-wider font-semibold">
            <Radio size={14} className="animate-pulse text-[#c8ff00]" />
            <span>DISPATCH OPERATIONS CONTROL ROOM</span>
          </div>
          <h1 className="text-xl font-bold text-white font-mono uppercase tracking-tight">
            Live Dispatch & Real-Time Rerouting
          </h1>
          <p className="text-xs text-neutral-400 mt-0.5 font-sans">
            Tactical fleet dispatching, instant rerouting execution, and live incident mitigation.
          </p>
        </div>

        {/* Quick Dispatch Actions */}
        <div className="flex items-center space-x-2 font-mono text-xs">
          <button
            onClick={onTriggerIncidentDemo}
            className="px-3.5 py-2 bg-[#c8ff00] hover:bg-[#b5e600] text-black font-bold uppercase tracking-wider transition-all flex items-center space-x-1.5 shadow-lg shadow-[#c8ff00]/10"
          >
            <RotateCcw size={14} />
            <span>REOPTIMIZE AFFECTED ROUTES</span>
          </button>
          <button
            onClick={() => onNavigate("reoptimization")}
            className="px-3.5 py-2 bg-[#141414] hover:bg-[#1f1f1f] border border-neutral-800 text-white font-bold uppercase tracking-wider transition-all flex items-center space-x-1.5"
          >
            <Navigation size={14} className="text-[#c8ff00]" />
            <span>REROUTE VEHICLE</span>
          </button>
        </div>
      </div>


      {/* Dispatch Tactical KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 font-mono">
        <div className="bg-[#0b0c0e] border border-slate-800 p-3">
          <span className="text-[10px] text-slate-400 uppercase">ONLINE FLEET</span>
          <div className="text-xl font-bold text-emerald-400 mt-1">{data.vehiclesOnline}</div>
          <span className="text-[9px] text-slate-500">100% Signal Quality</span>
        </div>

        <div className="bg-[#0b0c0e] border border-slate-800 p-3">
          <span className="text-[10px] text-slate-400 uppercase">MOVING</span>
          <div className="text-xl font-bold text-sky-400 mt-1">{data.vehiclesMoving}</div>
          <span className="text-[9px] text-sky-400">In Transit</span>
        </div>

        <div className="bg-[#0b0c0e] border border-slate-800 p-3">
          <span className="text-[10px] text-slate-400 uppercase">IDLE / STOPPED</span>
          <div className="text-xl font-bold text-slate-400 mt-1">{data.vehiclesIdle}</div>
          <span className="text-[9px] text-slate-500">At Depots</span>
        </div>

        <div className="bg-[#0b0c0e] border border-slate-800 p-3">
          <span className="text-[10px] text-slate-400 uppercase">ACTIVE ROUTES</span>
          <div className="text-xl font-bold text-white mt-1">{data.activeRoutes}</div>
          <span className="text-[9px] text-slate-500">Rajpur Sector</span>
        </div>

        <div className="bg-[#0b0c0e] border border-slate-800 p-3">
          <span className="text-[10px] text-slate-400 uppercase">DELAYED ROUTES</span>
          <div className="text-xl font-bold text-red-400 mt-1">{data.delayedRoutes}</div>
          <span className="text-[9px] text-red-400">Requires Action</span>
        </div>

        <div className="bg-[#0b0c0e] border border-slate-800 p-3">
          <span className="text-[10px] text-slate-400 uppercase">CRITICAL ALERTS</span>
          <div className="text-xl font-bold text-amber-400 mt-1">{data.criticalIncidentsCount}</div>
          <span className="text-[9px] text-amber-400">Express E17</span>
        </div>
      </div>

      {/* Main Tactical Dispatch Workspace */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Dominant Tactical Map (7 Columns) */}
        <div className="lg:col-span-7 bg-[#0b0c0e] border border-slate-800 p-4 flex flex-col min-h-[500px] relative">
          <div className="flex items-center justify-between mb-3 font-mono text-xs">
            <div className="flex items-center space-x-2">
              <Layers size={14} className="text-purple-400" />
              <span className="font-bold text-white uppercase">TACTICAL DISPATCH MAP</span>
            </div>
            <span className="text-[10px] text-emerald-400 font-bold">CLICK VEHICLE FOR INSPECTOR</span>
          </div>

          <div className="flex-1 min-h-[440px] relative">
            <LiveOperationsMap onSelectVehicle={(v) => setSelectedVehicle(v)} />

            {/* Compact Vehicle Detail Panel (when vehicle selected) */}
            {selectedVehicle && (
              <div className="absolute top-4 right-4 z-30 w-72 bg-[#0c0e12]/95 border border-slate-700 p-3 font-mono text-xs text-white shadow-2xl backdrop-blur-md">
                <div className="flex items-center justify-between border-b border-slate-800 pb-2 mb-2">
                  <div className="font-bold text-emerald-400 flex items-center">
                    <Truck size={14} className="mr-1.5" />
                    {selectedVehicle.code || "VH-007"}
                  </div>
                  <button onClick={() => setSelectedVehicle(null)} className="text-slate-400 hover:text-white">
                    <X size={14} />
                  </button>
                </div>

                <div className="space-y-1.5 text-[11px]">
                  <div className="flex justify-between"><span className="text-slate-400">DRIVER:</span><span>{selectedVehicle.driver || "Vikram Singh"}</span></div>
                  <div className="flex justify-between"><span className="text-slate-400">STATUS:</span><span className="text-emerald-400 font-bold">{selectedVehicle.status || "Active"}</span></div>
                  <div className="flex justify-between"><span className="text-slate-400">NEXT STOP:</span><span className="text-sky-300 truncate max-w-[120px]">{selectedVehicle.nextStop || "Civil Lines #14"}</span></div>
                  <div className="flex justify-between"><span className="text-slate-400">ETA:</span><span>{selectedVehicle.eta || "09:12 AM"}</span></div>
                  <div className="flex justify-between"><span className="text-slate-400">SPEED:</span><span>34 km/h</span></div>
                </div>

                <div className="mt-3 pt-2 border-t border-slate-800 flex space-x-2">
                  <button
                    onClick={onTriggerIncidentDemo}
                    className="flex-1 py-1.5 bg-amber-500 hover:bg-amber-400 text-black font-bold text-[10px] uppercase text-center"
                  >
                    REROUTE NOW
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Dispatch Controls & Feeds (5 Columns) */}
        <div className="lg:col-span-5 space-y-4 font-mono">
          {/* Critical Incidents Action Card */}
          <div className="bg-[#0b0c0e] border border-amber-900/40 p-4">
            <div className="flex items-center justify-between mb-3 border-b border-amber-900/30 pb-2">
              <h2 className="text-xs font-bold text-amber-400 uppercase tracking-wider flex items-center">
                <AlertTriangle size={15} className="mr-2" />
                CRITICAL DISPATCH INCIDENT
              </h2>
              <span className="text-[10px] bg-red-950 text-red-400 px-2 py-0.5 border border-red-800 font-bold">
                IMMEDIATE REROUTE
              </span>
            </div>

            {data.criticalIncidents.map((inc) => (
              <div key={inc.id} className="p-3 bg-slate-900/60 border border-slate-800 space-y-2">
                <div className="flex justify-between text-xs">
                  <span className="font-bold text-white">{inc.location}</span>
                  <span className="font-bold text-red-400">{inc.delayText}</span>
                </div>
                <div className="text-[11px] text-slate-400">
                  {inc.vehiclesAffected} vehicles currently trapped in congestion queue.
                </div>
                <div className="pt-2 flex space-x-2">
                  <button
                    onClick={onTriggerIncidentDemo}
                    className="flex-1 py-1.5 bg-amber-500 hover:bg-amber-400 text-black font-bold text-xs uppercase"
                  >
                    REROUTE AFFECTED ({inc.vehiclesAffected})
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Active Routes Status List */}
          <div className="bg-[#0b0c0e] border border-slate-800 p-4">
            <div className="flex items-center justify-between mb-3 border-b border-slate-800 pb-2">
              <h2 className="text-xs font-bold text-white uppercase tracking-wider flex items-center">
                <Navigation size={14} className="text-sky-400 mr-2" />
                DISPATCH ROUTE MONITOR
              </h2>
              <span className="text-[10px] text-slate-400">40 ACTIVE</span>
            </div>

            <div className="divide-y divide-slate-800/80 text-xs">
              {data.activeRoutesList.map((route) => (
                <div key={route.id} className="py-2.5 flex items-center justify-between">
                  <div>
                    <div className="flex items-center space-x-2">
                      <span className="font-bold text-white">{route.routeCode}</span>
                      <span className="text-slate-400">({route.vehicleCode})</span>
                    </div>
                    <div className="text-[10px] text-slate-400">{route.nextStop}</div>
                  </div>
                  <div className="text-right">
                    <div className={`font-bold ${route.status === "DELAYED" ? "text-red-400" : route.status === "REROUTED" ? "text-amber-400" : "text-emerald-400"}`}>
                      {route.eta} {route.delayMin > 0 && `(+${route.delayMin}m)`}
                    </div>
                    <span className="text-[9px] text-slate-500 uppercase">{route.driver}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Real-time Telemetry Activity Feed */}
          <div className="bg-[#0b0c0e] border border-slate-800 p-4">
            <div className="flex items-center justify-between mb-3 border-b border-slate-800 pb-2">
              <h2 className="text-xs font-bold text-white uppercase tracking-wider flex items-center">
                <Clock size={14} className="text-emerald-400 mr-2" />
                REAL-TIME DISPATCH LOG
              </h2>
              <span className="text-[10px] text-emerald-400 font-bold flex items-center">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse mr-1" />
                LIVE STREAM
              </span>
            </div>

            <div className="space-y-2 text-[11px]">
              {data.realtimeActivityFeed.map((feed) => (
                <div key={feed.id} className="p-2 bg-slate-900/40 border border-slate-800/60 flex items-start space-x-2">
                  <span className="text-slate-500 text-[10px]">{feed.time}</span>
                  <span className="text-slate-300 flex-1">{feed.text}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
