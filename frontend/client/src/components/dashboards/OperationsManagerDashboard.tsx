import React, { useState, useEffect } from "react";
import { getOperationsDashboardData, OperationsDashboardData } from "@/services/dashboardService";
import { dashboardApi, demoApi, DemoScenarioResponse } from "@/services/apiClient";
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
  Database,
} from "lucide-react";

interface OperationsManagerDashboardProps {
  onNavigate: (tab: string) => void;
  onTriggerIncidentDemo: () => void;
}

export function OperationsManagerDashboard({
  onNavigate,
  onTriggerIncidentDemo,
}: OperationsManagerDashboardProps) {
  const [data, setData] = useState<OperationsDashboardData>(getOperationsDashboardData());
  const [scenario, setScenario] = useState<DemoScenarioResponse | null>(null);
  const [isLive, setIsLive] = useState<boolean>(false);
  const [selectedVehicle, setSelectedVehicle] = useState<any | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function fetchBackendData() {
      try {
        const [opsRes, scenarioRes] = await Promise.allSettled([
          dashboardApi.getOperationsDashboard(),
          demoApi.getScenario(),
        ]);

        if (!isMounted) return;

        if (opsRes.status === "fulfilled" && opsRes.value) {
          const raw = opsRes.value;
          const mappedData: OperationsDashboardData = {
            activeVehicles: raw.active_vehicles ?? raw.activeVehicles ?? 40,
            activeRoutes: raw.active_routes ?? raw.activeRoutes ?? 40,
            deliveryStops: raw.delivery_stops ?? raw.deliveryStops ?? 300,
            networkCongestion: raw.network_congestion ?? raw.networkCongestion ?? 38,
            avgSpeedKmh: raw.avg_speed_kmh ?? raw.avgSpeedKmh ?? 32,
            onTimeDeliveryPercent: raw.on_time_delivery_percent ?? raw.onTimeDeliveryPercent ?? 94.2,
            delayedRoutesCount: raw.delayed_routes_count ?? raw.delayed_routes ?? raw.delayedRoutesCount ?? 4,
            optimizationStatus: raw.optimization_status ?? raw.optimizationStatus ?? "OPTIMIZATION READY",
            operationalHealth: raw.operational_health ?? raw.operationalHealth ?? { onSchedule: 34, delayed: 4, idle: 2, atRisk: 3, exceptions: 1 },
            latestIncident: raw.latest_incident ? {
              code: raw.latest_incident.code ?? "E17",
              location: raw.latest_incident.location ?? "Rajpur Express E17",
              delayIncreasePercent: raw.latest_incident.delay_increase_percent ?? raw.latest_incident.delayIncreasePercent ?? 78,
              affectedVehicles: raw.latest_incident.affected_vehicles ?? raw.latest_incident.affectedVehicles ?? 6,
              affectedRoutes: raw.latest_incident.affected_routes ?? raw.latest_incident.affectedRoutes ?? 4,
              severity: raw.latest_incident.severity ?? "High",
            } : getOperationsDashboardData().latestIncident,
            currentOptimization: raw.current_optimization ? {
              runId: raw.current_optimization.run_id ?? raw.current_optimization.runId ?? "QPSO-RUN-8942",
              algorithm: raw.current_optimization.algorithm ?? "QPSO (Quantum Swarm)",
              vehicleCount: raw.current_optimization.vehicle_count ?? raw.current_optimization.vehicleCount ?? 40,
              stopCount: raw.current_optimization.stop_count ?? raw.current_optimization.stopCount ?? 300,
              progressPercent: raw.current_optimization.progress_percent ?? raw.current_optimization.progressPercent ?? 100,
              bestFitness: raw.current_optimization.best_fitness ?? raw.current_optimization.bestFitness ?? 1240.8,
              status: raw.current_optimization.status ?? "COMPLETED",
              lastRunTime: raw.current_optimization.last_run_time ?? raw.current_optimization.lastRunTime ?? "08:40 AM",
            } : getOperationsDashboardData().currentOptimization,
            priorityActions: (raw.priority_actions ?? raw.priorityActions ?? []).map((pa: any) => ({
              id: pa.id,
              title: pa.title,
              urgency: pa.urgency,
              count: pa.count,
              actionLabel: pa.action_label ?? pa.actionLabel,
              targetTab: pa.target_tab ?? pa.targetTab,
            })),
          };

          if (!mappedData.priorityActions || mappedData.priorityActions.length === 0) {
            mappedData.priorityActions = getOperationsDashboardData().priorityActions;
          }

          setData(mappedData);
          setIsLive(true);
        }

        if (scenarioRes.status === "fulfilled" && scenarioRes.value) {
          setScenario(scenarioRes.value);
        }
      } catch (error) {
        console.warn("[Q-FLOW Dashboard] Error connecting to Supabase backend API:", error);
      }
    }

    fetchBackendData();

    return () => {
      isMounted = false;
    };
  }, []);

  const totalVehiclesCount = scenario?.vehicles?.length ?? data.activeVehicles;
  const deliveryStopsCount = scenario?.delivery_points?.length ?? data.deliveryStops;
  const activeRoutesCount = scenario?.routes?.length ?? data.activeRoutes;
  const affectedVehiclesCount = scenario?.vehicles?.filter((v: any) => v.status === "Affected")?.length ?? 6;
  const onScheduleVehiclesCount = totalVehiclesCount - affectedVehiclesCount;

  return (
    <div className="space-y-6 font-sans">
      {/* Header Banner */}
      <div className="p-5 bg-[#0d0d0d] border border-neutral-800 flex flex-col lg:flex-row lg:items-center justify-between gap-4 relative overflow-hidden">
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-[#c8ff00] via-emerald-400 to-amber-400" />
        <div>
          <div className="flex items-center space-x-2 mb-1 font-mono text-xs text-[#c8ff00] uppercase tracking-wider font-semibold">
            <Activity size={14} />
            <span>OPERATIONS COMMAND CENTER</span>
            {isLive && (
              <span className="ml-2 px-2 py-0.5 bg-[#c8ff00]/15 text-[#c8ff00] border border-[#c8ff00]/40 text-[10px] font-bold flex items-center gap-1.5 rounded-none">
                <Database size={11} className="text-[#c8ff00]" />
                <span className="w-1.5 h-1.5 rounded-full bg-[#c8ff00] animate-pulse" />
                SUPABASE LIVE API
              </span>
            )}
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight font-mono">
            Fleet Operations Overview
          </h1>
          <p className="text-xs text-neutral-400 mt-1">
            Real-time urban vehicle tracking, network congestion intelligence, and quantum swarm route optimization.
          </p>
        </div>

        <div className="flex items-center space-x-3 font-mono">
          <button
            onClick={() => onNavigate("route-optimization")}
            className="px-4 py-2.5 bg-[#c8ff00] hover:bg-[#b5e600] text-black font-bold text-xs uppercase tracking-wider transition-all flex items-center space-x-2 shadow-lg shadow-[#c8ff00]/10"
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
          <div className="text-xl font-bold text-emerald-400 mt-1">{totalVehiclesCount}</div>
          <span className="text-[9px] text-slate-500 mt-1">100% Operational</span>
        </div>

        <div className="bg-[#0b0c0e] border border-slate-800 p-3 flex flex-col justify-between">
          <span className="text-[10px] text-slate-400 uppercase">ACTIVE ROUTES</span>
          <div className="text-xl font-bold text-white mt-1">{activeRoutesCount}</div>
          <span className="text-[9px] text-slate-500 mt-1">{scenario?.network?.name || "Rajpur Urban Zone"}</span>
        </div>

        <div className="bg-[#0b0c0e] border border-slate-800 p-3 flex flex-col justify-between">
          <span className="text-[10px] text-slate-400 uppercase">DELIVERY STOPS</span>
          <div className="text-xl font-bold text-sky-400 mt-1">{deliveryStopsCount}</div>
          <span className="text-[9px] text-slate-500 mt-1">Central Depot</span>
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
          <div className="text-xs font-bold text-emerald-400 mt-1 font-mono tracking-tight">{data.optimizationStatus}</div>
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
              <span className="text-slate-400">{totalVehiclesCount} Vehicles</span>
              <span className="text-slate-500">•</span>
              <span className="text-emerald-400 font-bold">{onScheduleVehiclesCount} On Schedule</span>
              <span className="text-slate-500">•</span>
              <span className="text-red-400 font-bold">{affectedVehiclesCount} Affected</span>
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
                {data.priorityActions.length} ISSUES
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
                <span className="text-white">{totalVehiclesCount} Vehicles • {deliveryStopsCount} Stops</span>
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

