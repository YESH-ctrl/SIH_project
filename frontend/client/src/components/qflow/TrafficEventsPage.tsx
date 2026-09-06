import React from "react";
import { QFlowDataStore, TrafficIncident } from "@/data/qflowData";
import { Button } from "@/components/ui/button";
import { AlertTriangle, RefreshCw, ShieldAlert, Truck, Navigation, Clock, CheckCircle2, ChevronRight } from "lucide-react";

interface EventsPageProps {
  onTriggerReoptimization: () => void;
}

export function TrafficEventsPage({ onTriggerReoptimization }: EventsPageProps) {
  return (
    <div className="space-y-4 font-sans text-white">
      {/* Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-800">
        <div>
          <h1 className="text-xl font-bold font-mono text-white tracking-tight uppercase flex items-center">
            <AlertTriangle size={20} className="mr-2 text-red-400" /> TRAFFIC EVENTS & INCIDENT MANAGEMENT
          </h1>
          <p className="text-xs text-slate-400 font-sans">
            Detect and manage real-time disruptions affecting fleet operations across the transportation network.
          </p>
        </div>

        <Button
          onClick={onTriggerReoptimization}
          className="bg-red-500 hover:bg-red-600 text-white font-mono font-bold text-xs uppercase rounded-none px-4 py-2 flex items-center space-x-1.5 shadow-lg"
        >
          <RefreshCw size={14} className="animate-spin" />
          <span>REOPTIMIZE AFFECTED ROUTES</span>
        </Button>
      </div>

      {/* Main Incident Spotlight Card (SIH Jury Focus) */}
      <div className="p-5 bg-[#12080a] border border-red-500/40 relative overflow-hidden font-mono space-y-4">
        <div className="absolute top-0 right-0 w-80 h-80 bg-red-500/5 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-3 border-b border-red-500/30">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded bg-red-500/20 border border-red-500/50 flex items-center justify-center text-red-400">
              <ShieldAlert size={20} />
            </div>
            <div>
              <div className="text-xs text-red-400 font-bold uppercase tracking-widest flex items-center">
                <span className="w-2 h-2 rounded-full bg-red-500 animate-ping mr-1.5" /> CRITICAL DISRUPTION DETECTED
              </div>
              <h2 className="text-base font-extrabold text-white">
                Vehicle Collision on Express Corridor E17
              </h2>
            </div>
          </div>

          <div className="flex items-center space-x-3 text-xs">
            <span className="px-2.5 py-1 bg-red-500/20 text-red-400 border border-red-500/40 font-bold">
              SEVERITY: HIGH
            </span>
            <span className="px-2.5 py-1 bg-slate-900 text-slate-300 border border-slate-800">
              STATUS: REOPTIMIZATION REQUIRED
            </span>
          </div>
        </div>

        {/* Impact Analysis Metrics Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
          <div className="p-3 bg-slate-950/80 border border-red-500/20">
            <span className="text-slate-400 block text-[9px] uppercase">TRAVEL TIME DELAY</span>
            <span className="text-2xl font-bold text-red-400">+78%</span>
            <span className="text-[10px] text-slate-400 block">Speed dropped to 14 km/h</span>
          </div>

          <div className="p-3 bg-slate-950/80 border border-slate-800">
            <span className="text-slate-400 block text-[9px] uppercase">AFFECTED VEHICLES</span>
            <span className="text-2xl font-bold text-white">6 <span className="text-xs font-normal text-slate-400">Vehicles</span></span>
            <span className="text-[10px] text-amber-400 block">V-001 through V-006</span>
          </div>

          <div className="p-3 bg-slate-950/80 border border-slate-800">
            <span className="text-slate-400 block text-[9px] uppercase">AFFECTED ROUTES</span>
            <span className="text-2xl font-bold text-white">4 <span className="text-xs font-normal text-slate-400">Routes</span></span>
            <span className="text-[10px] text-sky-400 block">R-001, R-003, R-005, R-007</span>
          </div>

          <div className="p-3 bg-slate-950/80 border border-slate-800">
            <span className="text-slate-400 block text-[9px] uppercase">AFFECTED CUSTOMERS</span>
            <span className="text-2xl font-bold text-white">24 <span className="text-xs font-normal text-slate-400">Stops</span></span>
            <span className="text-[10px] text-indigo-400 block">Zone 3 Deliveries</span>
          </div>
        </div>

        {/* Primary CTA */}
        <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="text-xs text-slate-300 font-sans">
            Warm-start QPSO solver is prepared to re-route affected vehicles around E17 using local zone population reuse (~2.1s execution time).
          </div>
          <Button
            onClick={onTriggerReoptimization}
            className="w-full sm:w-auto bg-red-500 hover:bg-red-600 text-white font-bold text-xs uppercase px-6 py-2.5 rounded-none flex items-center justify-center space-x-2 shadow-lg shrink-0"
          >
            <span>REOPTIMIZE AFFECTED ROUTES NOW</span>
            <ArrowRight size={14} />
          </Button>
        </div>
      </div>

      {/* Traffic Events Feed Table */}
      <div className="bg-[#0d1015] border border-slate-800 p-4 font-mono text-xs space-y-3">
        <div className="flex items-center justify-between border-b border-slate-800 pb-2">
          <span className="font-bold text-white uppercase tracking-wider">NETWORK INCIDENT LOG</span>
          <span className="text-[10px] text-slate-400">AUTOMATIC DETECTED DISRUPTIONS</span>
        </div>

        <div className="divide-y divide-slate-800">
          {QFlowDataStore.incidents.map((incident) => (
            <div key={incident.id} className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
              <div className="flex items-start space-x-3">
                <AlertTriangle
                  size={16}
                  className={incident.severity === "High" ? "text-red-400 shrink-0 mt-0.5" : "text-amber-400 shrink-0 mt-0.5"}
                />
                <div>
                  <div className="font-bold text-white flex items-center space-x-2">
                    <span>{incident.title}</span>
                    <span className="text-[9px] px-1.5 py-0.2 bg-slate-800 text-slate-400 font-normal">
                      {incident.id}
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-400 font-sans mt-0.5">
                    Location: <strong className="text-slate-200">{incident.roadName}</strong> ({incident.affectedZone}) • Detected at {incident.detectedTime}
                  </div>
                </div>
              </div>

              <div className="flex items-center space-x-3 self-end sm:self-center">
                <div className="text-right text-[10px] hidden md:block">
                  <div className="text-slate-300 font-bold">{incident.affectedVehiclesCount} Vehicles Impacted</div>
                  <div className="text-slate-500">{incident.affectedCustomersCount} Customer Deliveries</div>
                </div>
                <Button
                  onClick={onTriggerReoptimization}
                  size="sm"
                  className="bg-red-500/20 hover:bg-red-500/30 text-red-400 border border-red-500/40 text-[10px] font-mono rounded-none"
                >
                  REOPTIMIZE
                </Button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function ArrowRight(props: any) {
  return <Navigation {...props} />;
}
