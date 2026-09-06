import React, { useState } from "react";
import { QFlowDataStore, Vehicle, TrafficSegment, TrafficIncident } from "@/data/qflowData";
import { LiveOperationsMap } from "./LiveOperationsMap";
import { Button } from "@/components/ui/button";
import {
  Truck,
  Navigation,
  PackageCheck,
  Activity,
  Gauge,
  Cpu,
  Play,
  AlertTriangle,
  RefreshCw,
  Clock,
  CheckCircle2,
  ChevronRight,
  X,
} from "lucide-react";

interface OverviewPageProps {
  onNavigate: (tab: string) => void;
  onTriggerIncidentDemo: () => void;
}

export function OverviewPage({ onNavigate, onTriggerIncidentDemo }: OverviewPageProps) {
  const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | null>(
    QFlowDataStore.vehicles[6] // Vehicle 07
  );
  const [selectedRoad, setSelectedRoad] = useState<TrafficSegment | null>(null);

  return (
    <div className="space-y-4 font-sans text-white">
      {/* Page Title & Narrative Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-800">
        <div>
          <h1 className="text-xl font-bold font-mono text-white tracking-tight uppercase">
            FLEET OPERATIONS OVERVIEW
          </h1>
          <p className="text-xs text-slate-400 font-sans">
            Monitor fleet movement, traffic conditions, and optimization performance in real time.
          </p>
        </div>

        {/* Primary Action Buttons for Jury Demonstration */}
        <div className="flex items-center space-x-2 font-mono text-xs">
          <Button
            onClick={() => onNavigate("route-optimization")}
            className="bg-emerald-500 hover:bg-emerald-600 text-black font-bold uppercase rounded-none px-4 py-2 flex items-center space-x-1.5 shadow-md"
          >
            <Cpu size={14} />
            <span>OPTIMIZE FLEET</span>
          </Button>

          <Button
            onClick={() => onNavigate("simulation")}
            variant="outline"
            className="border-slate-700 bg-slate-800 hover:bg-slate-700 text-white rounded-none px-3.5 py-2 flex items-center space-x-1.5"
          >
            <Play size={13} className="text-sky-400" />
            <span>RUN SIMULATION</span>
          </Button>

          <Button
            onClick={onTriggerIncidentDemo}
            className="bg-red-500/20 hover:bg-red-500/30 text-red-400 border border-red-500/40 rounded-none px-3.5 py-2 flex items-center space-x-1.5"
          >
            <AlertTriangle size={13} />
            <span>SIMULATE INCIDENT</span>
          </Button>
        </div>
      </div>

      {/* Top Operational KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 font-mono text-xs">
        <div className="p-3 bg-[#0d1015] border border-slate-800 space-y-1">
          <div className="flex items-center justify-between text-slate-400 text-[10px] uppercase font-semibold">
            <span>ACTIVE VEHICLES</span>
            <Truck size={13} className="text-sky-400" />
          </div>
          <div className="text-2xl font-bold text-white tracking-tight">40</div>
          <div className="text-[10px] text-emerald-400 flex items-center">
            <CheckCircle2 size={10} className="mr-1" /> 100% Operational
          </div>
        </div>

        <div className="p-3 bg-[#0d1015] border border-slate-800 space-y-1">
          <div className="flex items-center justify-between text-slate-400 text-[10px] uppercase font-semibold">
            <span>ACTIVE ROUTES</span>
            <Navigation size={13} className="text-sky-400" />
          </div>
          <div className="text-2xl font-bold text-white tracking-tight">40</div>
          <div className="text-[10px] text-slate-400">Coordinated Fleet</div>
        </div>

        <div className="p-3 bg-[#0d1015] border border-slate-800 space-y-1">
          <div className="flex items-center justify-between text-slate-400 text-[10px] uppercase font-semibold">
            <span>DELIVERY STOPS</span>
            <PackageCheck size={13} className="text-indigo-400" />
          </div>
          <div className="text-2xl font-bold text-white tracking-tight">300</div>
          <div className="text-[10px] text-indigo-400">3 Depots Serviced</div>
        </div>

        <div className="p-3 bg-[#0d1015] border border-slate-800 space-y-1">
          <div className="flex items-center justify-between text-slate-400 text-[10px] uppercase font-semibold">
            <span>NETWORK CONGESTION</span>
            <Activity size={13} className="text-amber-400" />
          </div>
          <div className="text-2xl font-bold text-amber-400 tracking-tight">38%</div>
          <div className="text-[10px] text-amber-400">Moderate Flow</div>
        </div>

        <div className="p-3 bg-[#0d1015] border border-slate-800 space-y-1">
          <div className="flex items-center justify-between text-slate-400 text-[10px] uppercase font-semibold">
            <span>AVERAGE SPEED</span>
            <Gauge size={13} className="text-emerald-400" />
          </div>
          <div className="text-2xl font-bold text-white tracking-tight">32 <span className="text-xs font-normal text-slate-400">km/h</span></div>
          <div className="text-[10px] text-emerald-400">+4.2 km/h vs baseline</div>
        </div>

        <div className="p-3 bg-[#0d1015] border border-slate-800 space-y-1">
          <div className="flex items-center justify-between text-slate-400 text-[10px] uppercase font-semibold">
            <span>OPTIMIZATION</span>
            <Cpu size={13} className="text-emerald-400" />
          </div>
          <div className="text-xl font-bold text-emerald-400 tracking-tight">READY</div>
          <div className="text-[10px] text-slate-400">Warm Start ~8s</div>
        </div>
      </div>

      {/* Main Content Layout: Map (65%) + Live Operations Panel (35%) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 h-[540px]">
        {/* Main Operational Map View */}
        <div className="lg:col-span-8 h-full relative">
          <LiveOperationsMap
            selectedVehicle={selectedVehicle}
            onSelectVehicle={(veh) => {
              setSelectedVehicle(veh);
              setSelectedRoad(null);
            }}
            onSelectRoad={(road) => {
              setSelectedRoad(road);
              setSelectedVehicle(null);
            }}
          />

          {/* Vehicle Info Drawer Popup */}
          {selectedVehicle && (
            <div className="absolute bottom-4 right-4 w-72 bg-[#0c0e12]/95 border border-slate-700 p-4 shadow-xl backdrop-blur font-mono text-xs z-20 space-y-2">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                <div className="flex items-center space-x-2">
                  <Truck size={14} className="text-sky-400" />
                  <span className="font-bold text-white">{selectedVehicle.name}</span>
                </div>
                <button
                  onClick={() => setSelectedVehicle(null)}
                  className="text-slate-400 hover:text-white"
                >
                  <X size={14} />
                </button>
              </div>

              <div className="space-y-1.5 text-[11px]">
                <div className="flex justify-between">
                  <span className="text-slate-400 uppercase">STATUS:</span>
                  <span
                    className={`font-bold ${
                      selectedVehicle.status === "Affected"
                        ? "text-red-400"
                        : selectedVehicle.status === "Delayed"
                        ? "text-amber-400"
                        : "text-emerald-400"
                    }`}
                  >
                    {selectedVehicle.status}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400 uppercase">TYPE:</span>
                  <span className="text-slate-200">{selectedVehicle.type}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400 uppercase">ROUTE:</span>
                  <span className="text-sky-400 font-bold">{selectedVehicle.routeId}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400 uppercase">NEXT STOP:</span>
                  <span className="text-slate-200 font-semibold">{selectedVehicle.nextStop}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400 uppercase">ETA:</span>
                  <span className="text-white font-bold">{selectedVehicle.eta}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400 uppercase">PAYLOAD LOAD:</span>
                  <span className="text-slate-200">
                    {selectedVehicle.currentLoadKg} / {selectedVehicle.capacityKg} kg
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Right-side Live Operations Panel */}
        <div className="lg:col-span-4 h-full bg-[#0d1015] border border-slate-800 p-4 space-y-4 font-mono text-xs flex flex-col justify-between">
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <span className="font-bold text-white uppercase tracking-wider">LIVE OPERATIONS</span>
              <span className="text-[10px] text-emerald-400 font-semibold flex items-center">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 mr-1 animate-pulse" /> SYSTEM ONLINE
              </span>
            </div>

            {/* Network System Status Summary */}
            <div className="grid grid-cols-2 gap-2 text-[11px]">
              <div className="p-2 bg-slate-900/80 border border-slate-800">
                <div className="text-slate-400 text-[9px] uppercase">NETWORK STATUS</div>
                <div className="font-bold text-emerald-400 mt-0.5">Operational</div>
              </div>
              <div className="p-2 bg-slate-900/80 border border-slate-800">
                <div className="text-slate-400 text-[9px] uppercase">FLEET STATUS</div>
                <div className="font-bold text-white mt-0.5">40 / 40 Active</div>
              </div>
              <div className="p-2 bg-slate-900/80 border border-slate-800">
                <div className="text-slate-400 text-[9px] uppercase">TRAFFIC STATUS</div>
                <div className="font-bold text-amber-400 mt-0.5">Moderate Flow</div>
              </div>
              <div className="p-2 bg-slate-900/80 border border-slate-800">
                <div className="text-slate-400 text-[9px] uppercase">OPTIMIZATION</div>
                <div className="font-bold text-emerald-400 mt-0.5">QPSO Ready</div>
              </div>
            </div>

            {/* Recent Operational Events Feed */}
            <div className="space-y-2">
              <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                RECENT NETWORK EVENTS
              </div>
              <div className="space-y-2 max-h-[260px] overflow-y-auto">
                <div
                  onClick={onTriggerIncidentDemo}
                  className="p-2.5 bg-red-500/10 border border-red-500/30 hover:border-red-500 cursor-pointer transition-all space-y-1"
                >
                  <div className="flex items-center justify-between text-red-400 font-bold text-[11px]">
                    <span className="flex items-center">
                      <AlertTriangle size={12} className="mr-1" /> 08:42 AM
                    </span>
                    <span className="text-[9px] uppercase px-1 bg-red-500/20">HIGH SEVERITY</span>
                  </div>
                  <div className="text-white text-xs">Traffic Incident detected on E17</div>
                  <div className="text-[10px] text-slate-400">
                    6 Vehicles & 4 Routes Affected • Click to Re-optimize
                  </div>
                </div>

                <div className="p-2.5 bg-slate-900 border border-slate-800 space-y-1">
                  <div className="flex items-center justify-between text-slate-300 font-bold text-[11px]">
                    <span className="flex items-center">
                      <Clock size={12} className="mr-1 text-slate-400" /> 08:31 AM
                    </span>
                    <span className="text-[9px] text-emerald-400 uppercase">COMPLETED</span>
                  </div>
                  <div className="text-slate-200 text-xs">QPSO Fleet Optimization Completed</div>
                  <div className="text-[10px] text-slate-400">40 Routes synchronized • Travel time -21.8%</div>
                </div>

                <div className="p-2.5 bg-slate-900 border border-slate-800 space-y-1">
                  <div className="flex items-center justify-between text-slate-300 font-bold text-[11px]">
                    <span className="flex items-center">
                      <Clock size={12} className="mr-1 text-slate-400" /> 08:18 AM
                    </span>
                    <span className="text-[9px] text-sky-400 uppercase">DISPATCHED</span>
                  </div>
                  <div className="text-slate-200 text-xs">Vehicle 12 dispatched from Central Depot</div>
                  <div className="text-[10px] text-slate-400">Target ETA: 09:18 AM • Payload 420 kg</div>
                </div>
              </div>
            </div>
          </div>

          <div className="pt-3 border-t border-slate-800 flex items-center justify-between text-[10px] text-slate-400">
            <span>SIH 2026 LIVE DEMONSTRATION</span>
            <button
              onClick={() => onNavigate("traffic-events")}
              className="text-sky-400 hover:underline flex items-center"
            >
              VIEW ALL EVENTS <ChevronRight size={10} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
