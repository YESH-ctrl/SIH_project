import React from "react";
import { QFlowDataStore } from "@/data/qflowData";
import { Building2, ShieldAlert, Truck, PackageCheck, Settings } from "lucide-react";

export function NetworkConfigPage({ subTab = "config" }: { subTab?: string }) {
  return (
    <div className="space-y-4 font-sans text-white">
      <div className="pb-2 border-b border-slate-800">
        <h1 className="text-xl font-bold font-mono text-white tracking-tight uppercase flex items-center">
          <Building2 size={20} className="mr-2 text-sky-400" /> NETWORK CONFIGURATION & RESTRICTIONS
        </h1>
        <p className="text-xs text-slate-400 font-sans">
          Manage depots, vehicle fleet definitions, delivery customer networks, and heavy-vehicle road restrictions.
        </p>
      </div>

      {/* Restrictions Section */}
      <div className="bg-[#0d1015] border border-slate-800 p-4 font-mono text-xs space-y-3">
        <div className="flex items-center justify-between border-b border-slate-800 pb-2">
          <span className="font-bold text-white uppercase tracking-wider flex items-center">
            <ShieldAlert size={14} className="mr-1.5 text-amber-400" /> ROAD & VEHICLE RESTRICTIONS
          </span>
          <span className="text-[10px] text-amber-400">ACTIVE ENFORCEMENT</span>
        </div>

        <div className="space-y-2">
          {QFlowDataStore.restrictions.map((rst) => (
            <div key={rst.id} className="p-3 bg-slate-900 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
              <div>
                <div className="font-bold text-white flex items-center space-x-2">
                  <span>{rst.zoneName}</span>
                  <span className="text-[9px] px-1.5 py-0.2 bg-amber-500/20 text-amber-400 border border-amber-500/30">
                    {rst.restrictionType}
                  </span>
                </div>
                <div className="text-[11px] text-slate-400 font-sans mt-0.5">{rst.description}</div>
              </div>
              <div className="text-right text-[10px]">
                <div className="text-slate-300 font-bold">TIME: {rst.timeRange}</div>
                <div className="text-emerald-400 font-semibold">{rst.status}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Depots Grid */}
      <div className="bg-[#0d1015] border border-slate-800 p-4 font-mono text-xs space-y-3">
        <div className="flex items-center justify-between border-b border-slate-800 pb-2">
          <span className="font-bold text-white uppercase tracking-wider flex items-center">
            <Building2 size={14} className="mr-1.5 text-sky-400" /> CENTRAL DEPOTS
          </span>
          <span className="text-[10px] text-slate-400">3 LOCATIONS</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {QFlowDataStore.depots.map((depot) => (
            <div key={depot.id} className="p-3 bg-slate-900 border border-slate-800 space-y-1">
              <div className="font-bold text-sky-400">{depot.name}</div>
              <div className="text-[10px] text-slate-400 font-sans">Depot ID: {depot.id}</div>
              <div className="text-[11px] text-slate-200">
                Capacity: <strong>{depot.capacityVehicles} Vehicles</strong>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
