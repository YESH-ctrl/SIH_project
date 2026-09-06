import React, { useState } from "react";
import { getOperationsDashboardData } from "@/services/dashboardService";
import { LiveOperationsMap } from "@/components/qflow/LiveOperationsMap";
import {
  Activity,
  Truck,
  MapPin,
  Clock,
  AlertTriangle,
  Zap,
  Play,
  CheckCircle2,
  TrendingUp,
  RotateCcw,
  ArrowRight,
  ShieldAlert,
  Layers,
} from "lucide-react";

interface OperationsManagerDashboardProps {
  onNavigate: (tab: string) => void;
  onTriggerIncidentDemo: () => void;
}

export function OperationsManagerDashboard({
  onNavigate,
  onTriggerIncidentDemo,
}: OperationsManagerDashboardProps) {
  const data = getOperationsDashboardData();
  const [selectedVehicle, setSelectedVehicle] = useState<any | null>(null);

  return (
    <div className="space-y-6 font-sans">
      {/* Header Strip */}
      <div className="p-5 bg-gradient-to-r from-[#0b0f17] via-[#090b0f] to-[#0b0f17] border border-slate-800 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2 mb-1 font-mono text-xs text-sky-400 uppercase tracking-wider">
            <Activity size={14} />
            <span>OPERATIONS COMMAND CENTER</span>
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight font-mono">
            Fleet Operations Overview
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Real-time urban vehicle tracking, network congestion intelligence, and quantum swarm route optimization.
          </p>
        </div>

        <div className="flex items-center space-x-3 font-mono">
          <button
            onClick={() => onNavigate("route-optimization")}
            className="px-4 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-black font-bold text-xs uppercase tracking-wider transition-all flex items-center space-x-2 shadow-lg"
          >
            <Zap size={15} />
            <span>START OPTIMIZATION</span>
          </button>
          <button
            onClick={onTriggerIncidentDemo}
            className="px-4 py-2.5 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/40 text-amber-400 font-bold text-xs uppercase tracking-wider transition-all flex items-center space-x-2"
          >
            <AlertTriangle size={15} />
            <span>SIMULATE INCIDENT</span>
          </button>
        </div>
      </div>

      {/* Top Operational KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-3 font-mono">
        <div className="bg-[#0b0c0e] border border-slate-800 p-3 flex flex-col justify-between">
          <span className="text-[10px] text-slate-400 uppercase">ACTIVE VEHICLES</span>
          <div className="text-xl font-bold text-emerald-400 mt-1">{data.activeVehicles}</div>
          <span className="text-[9px] text-slate-500 mt-1">100% Operational</span>
        </div>

        <div className="bg-[#0b0c0e] border border-slate-800 p-3 flex flex-col justify-between">
          <span className="text-[10px] text-slate-400 uppercase">ACTIVE ROUTES</span>
          <div className="text-xl font-bold text-white mt-1">{data.activeRoutes}</div>
          <span className="text-[9px] text-slate-500 mt-1">Rajpur Urban Zone</span>
        </div>

        <div className="bg-[#0b0c0e] border border-slate-800 p-3 flex flex-col justify-between">
          <span className="text-[10px] text-slate-400 uppercase">DELIVERY STOPS</span>
          <div className="text-xl font-bold text-sky-400 mt-1">{data.deliveryStops}</div>
          <span className="text-[9px] text-slate-500 mt-1">3 Central Depots</span>
        </div>

        <div className="bg-[#0b0c0e] border border-slate-800 p-3 flex flex-col justify-between">
          <span className="text-[10px] text-slate-400 uppercase">CONGESTION</span>
          <div className="text-xl font-bold text-amber-400 mt-1">{data.networkCongestion}%</div>
          <span className="text-[9px] text-amber-400 mt-1">Moderate Traffic</span>
        </div>

        <div className="bg-[#0b0c0e] border border-slate-800 p-3 flex flex-col justify-between">
          <span className="text-[10px] text-slate-400 uppercase">AVG SPEED</span>
          <div className="text-xl font-bold text-white mt-1">{data.avgSpeedKmh} <span className="text-xs">km/h</span></div>
          <span className="text-[9px] text-emerald-400 mt-1">+2.4 km/h vs avg</span>
        </div>

        <div className="bg-[#0b0c0e] border border-slate-800 p-3 flex flex-col justify-between">
          <span className="text-[10px] text-slate-400 uppercase">ON-TIME RATE</span>
          <div className="text-xl font-bold text-emerald-400 mt-1">{data.onTimeDeliveryPercent}%</div>
          <span className="text-[9px] text-emerald-400 mt-1">SLA Target 92%</span>
        </div>

        <div className="bg-[#0b0c0e] border border-slate-800 p-3 flex flex-col justify-between">
          <span className="text-[10px] text-slate-400 uppercase">DELAYED ROUTES</span>
          <div className="text-xl font-bold text-red-400 mt-1">{data.delayedRoutesCount}</div>
          <span className="text-[9px] text-red-400 mt-1">E17 Bottleneck</span>
        </div>

        <div className="bg-[#0b0c0e] border border-slate-800 p-3 flex flex-col justify-between">
          <span className="text-[10px] text-slate-400 uppercase">OPTIMIZATION</span>
          <div className="text-xs font-bold text-emerald-400 mt-1 font-mono tracking-tight">READY</div>
          <span className="text-[9px] text-slate-500 mt-1">QPSO Engine</span>
        </div>
      </div>

      {/* Dominant Map & Operational Panels */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Dominant Map Component (7 Columns) */}
        <div className="lg:col-span-7 bg-[#0b0c0e] border border-slate-800 p-4 flex flex-col min-h-[540px]">
          <div className="flex items-center justify-between mb-3 font-mono text-xs">
            <div className="flex items-center space-x-2">
              <Layers size={15} className="text-sky-400" />
              <span className="font-bold text-white uppercase">RAJPUR LIVE NETWORK CANVAS</span>
            </div>
            <div className="flex items-center space-x-3 text-[11px]">
              <span className="text-slate-400">40 Vehicles</span>
              <span className="text-slate-500">•</span>
              <span className="text-emerald-400 font-bold">34 On Schedule</span>
              <span className="text-slate-500">•</span>
              <span className="text-red-400 font-bold">6 Affected</span>
            </div>
          </div>

          <div className="flex-1 min-h-[460px] relative">
            <LiveOperationsMap onSelectVehicle={(v) => setSelectedVehicle(v)} />
          </div>
        </div>

        {/* Right Operations Side Panels (5 Columns) */}
        <div className="lg:col-span-5 space-y-5">
          {/* Priority Actions ("Needs Attention") */}
          <div className="bg-[#0b0c0e] border border-red-900/40 p-4">
            <div className="flex items-center justify-between mb-3 border-b border-red-900/30 pb-2">
              <h2 className="text-xs font-bold text-red-400 font-mono uppercase tracking-wider flex items-center">
                <ShieldAlert size={15} className="mr-2" />
                NEEDS ATTENTION • PRIORITY ACTIONS
              </h2>
              <span className="text-[10px] font-mono bg-red-950 text-red-300 px-2 py-0.5 border border-red-800">
                3 ISSUES
              </span>
            </div>

            <div className="space-y-2.5 font-mono text-xs">
              {data.priorityActions.map((pa) => (
                <div
                  key={pa.id}
                  className="p-3 bg-slate-900/80 border border-slate-800 flex items-center justify-between hover:border-slate-700 transition-all"
                >
                  <div>
                    <div className="font-bold text-white">{pa.title}</div>
                    <div className="text-[10px] text-slate-400 mt-0.5">Urgency: <span className="text-red-400 font-bold">{pa.urgency}</span></div>
                  </div>
                  <button
                    onClick={() => onNavigate(pa.targetTab)}
                    className="px-3 py-1.5 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 font-bold text-[11px] uppercase tracking-wider flex items-center space-x-1"
                  >
                    <span>{pa.actionLabel}</span>
                    <ArrowRight size={12} />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Traffic Incident Card */}
          <div className="bg-[#0b0c0e] border border-slate-800 p-4">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-xs font-bold text-amber-400 font-mono uppercase tracking-wider flex items-center">
                <AlertTriangle size={15} className="mr-2 text-amber-400" />
                ACTIVE TRAFFIC INCIDENT
              </h2>
              <span className="text-[10px] font-mono bg-amber-500/10 text-amber-400 border border-amber-500/30 px-2 py-0.5 font-bold">
                {data.latestIncident.severity}
              </span>
            </div>

            <div className="bg-slate-900/50 border border-slate-800 p-3 font-mono text-xs space-y-2">
              <div className="flex justify-between">
                <span className="text-slate-400">LOCATION:</span>
                <span className="font-bold text-white">{data.latestIncident.location}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">TRAFFIC DELAY:</span>
                <span className="font-bold text-red-400">+{data.latestIncident.delayIncreasePercent}% DELAY</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">AFFECTED FLEET:</span>
                <span className="font-bold text-amber-400">{data.latestIncident.affectedVehicles} Vehicles ({data.latestIncident.affectedRoutes} Routes)</span>
              </div>

              <div className="pt-2 border-t border-slate-800 flex justify-end">
                <button
                  onClick={onTriggerIncidentDemo}
                  className="w-full py-2 bg-amber-500 hover:bg-amber-400 text-black font-bold text-xs uppercase tracking-wider flex items-center justify-center space-x-1"
                >
                  <RotateCcw size={13} />
                  <span>REOPTIMIZE AFFECTED ROUTES</span>
                </button>
              </div>
            </div>
          </div>

          {/* QPSO Optimization Status Card */}
          <div className="bg-[#0b0c0e] border border-slate-800 p-4">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-xs font-bold text-white font-mono uppercase tracking-wider flex items-center">
                <Zap size={15} className="mr-2 text-emerald-400" />
                QUANTUM SWARM OPTIMIZATION SOLVER
              </h2>
              <span className="text-[10px] font-mono text-emerald-400 font-bold">
                {data.currentOptimization.status}
              </span>
            </div>

            <div className="p-3 bg-slate-900/50 border border-slate-800 font-mono text-xs space-y-2">
              <div className="flex justify-between">
                <span className="text-slate-400">ALGORITHM:</span>
                <span className="font-bold text-emerald-400">{data.currentOptimization.algorithm}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">PROBLEM SCOPE:</span>
                <span className="text-white">{data.currentOptimization.vehicleCount} Vehicles • {data.currentOptimization.stopCount} Stops</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">BEST FITNESS SCORE:</span>
                <span className="font-bold text-sky-400">{data.currentOptimization.bestFitness}</span>
              </div>

              <button
                onClick={() => onNavigate("route-optimization")}
                className="w-full mt-2 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-white font-bold text-xs uppercase tracking-wider flex items-center justify-center space-x-1"
              >
                <span>OPEN OPTIMIZATION SOLVER</span>
                <ArrowRight size={13} />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
