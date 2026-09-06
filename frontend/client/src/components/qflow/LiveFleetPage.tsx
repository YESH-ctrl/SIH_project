import React, { useState } from "react";
import { QFlowDataStore, Vehicle } from "@/data/qflowData";
import { Button } from "@/components/ui/button";
import { Truck, Navigation, Search, Filter, X, CheckCircle2, Clock, AlertTriangle } from "lucide-react";

export function LiveFleetPage() {
  const [statusFilter, setStatusFilter] = useState<string>("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | null>(null);

  const filteredVehicles = QFlowDataStore.vehicles.filter((v) => {
    const matchesStatus = statusFilter === "All" || v.status === statusFilter;
    const matchesSearch =
      v.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      v.type.toLowerCase().includes(searchQuery.toLowerCase()) ||
      v.currentLocation.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  return (
    <div className="space-y-4 font-sans text-white">
      {/* Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-800">
        <div>
          <h1 className="text-xl font-bold font-mono text-white tracking-tight uppercase flex items-center">
            <Truck size={20} className="mr-2 text-sky-400" /> LIVE FLEET OPERATIONS
          </h1>
          <p className="text-xs text-slate-400 font-sans">
            Monitor real-time vehicle locations, payload capacities, assigned routes, and operational statuses.
          </p>
        </div>

        {/* Filters */}
        <div className="flex items-center space-x-2 font-mono text-xs">
          {(["All", "Active", "Delayed", "Affected"] as const).map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`px-3 py-1.5 border transition-all ${
                statusFilter === st
                  ? "bg-slate-800 text-sky-400 font-bold border-sky-400"
                  : "bg-slate-900 text-slate-400 border-slate-800 hover:text-white"
              }`}
            >
              {st}
            </button>
          ))}
        </div>
      </div>

      {/* Fleet Table Card */}
      <div className="bg-[#0d1015] border border-slate-800 p-4 font-mono text-xs space-y-4">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="relative w-full sm:w-64">
            <Search size={14} className="absolute left-3 top-2.5 text-slate-500" />
            <input
              type="text"
              placeholder="Search vehicle ID, type..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-900 border border-slate-800 pl-9 pr-3 py-1.5 text-xs text-white placeholder:text-slate-600 rounded-none focus:outline-none focus:border-sky-400"
            />
          </div>

          <div className="text-[11px] text-slate-400">
            SHOWING <strong className="text-white">{filteredVehicles.length}</strong> OF 40 VEHICLES
          </div>
        </div>

        <div className="overflow-x-auto max-h-[500px]">
          <table className="w-full text-left text-[11px]">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400 uppercase text-[9px]">
                <th className="py-2.5 px-3">VEHICLE</th>
                <th className="py-2.5 px-3">TYPE</th>
                <th className="py-2.5 px-3">STATUS</th>
                <th className="py-2.5 px-3">LOCATION</th>
                <th className="py-2.5 px-3">NEXT STOP</th>
                <th className="py-2.5 px-3">LOAD / CAP</th>
                <th className="py-2.5 px-3">ETA</th>
                <th className="py-2.5 px-3">ROUTE</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {filteredVehicles.map((v) => (
                <tr
                  key={v.id}
                  onClick={() => setSelectedVehicle(v)}
                  className="hover:bg-slate-900/80 cursor-pointer transition-colors"
                >
                  <td className="py-2.5 px-3 font-bold text-sky-400">{v.id}</td>
                  <td className="py-2.5 px-3 text-slate-300">{v.type}</td>
                  <td className="py-2.5 px-3 font-semibold">
                    <span
                      className={`px-2 py-0.5 text-[9px] uppercase border ${
                        v.status === "Affected"
                          ? "bg-red-500/10 text-red-400 border-red-500/30"
                          : v.status === "Delayed"
                          ? "bg-amber-500/10 text-amber-400 border-amber-500/30"
                          : "bg-emerald-500/10 text-emerald-400 border-emerald-500/30"
                      }`}
                    >
                      {v.status}
                    </span>
                  </td>
                  <td className="py-2.5 px-3 text-slate-300">{v.currentLocation}</td>
                  <td className="py-2.5 px-3 text-slate-300">{v.nextStop}</td>
                  <td className="py-2.5 px-3 text-slate-300">
                    {v.currentLoadKg} / {v.capacityKg} kg
                  </td>
                  <td className="py-2.5 px-3 text-white font-bold">{v.eta}</td>
                  <td className="py-2.5 px-3 text-slate-400">{v.routeId}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Vehicle Detail Drawer Modal */}
      {selectedVehicle && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#0c0e12] border border-slate-700 p-6 max-w-md w-full font-mono text-xs space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center space-x-2">
                <Truck size={16} className="text-sky-400" />
                <span className="font-bold text-white text-sm">{selectedVehicle.name} DETAILS</span>
              </div>
              <button
                onClick={() => setSelectedVehicle(null)}
                className="text-slate-400 hover:text-white"
              >
                <X size={16} />
              </button>
            </div>

            <div className="space-y-2 text-[11px]">
              <div className="flex justify-between py-1.5 border-b border-slate-800/60">
                <span className="text-slate-400 uppercase">VEHICLE ID:</span>
                <span className="font-bold text-sky-400">{selectedVehicle.id}</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-slate-800/60">
                <span className="text-slate-400 uppercase">TYPE:</span>
                <span className="text-white">{selectedVehicle.type}</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-slate-800/60">
                <span className="text-slate-400 uppercase">STATUS:</span>
                <span className="font-bold text-emerald-400">{selectedVehicle.status}</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-slate-800/60">
                <span className="text-slate-400 uppercase">ASSIGNED ROUTE:</span>
                <span className="text-white font-bold">{selectedVehicle.routeId}</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-slate-800/60">
                <span className="text-slate-400 uppercase">CURRENT LOCATION:</span>
                <span className="text-slate-200">{selectedVehicle.currentLocation}</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-slate-800/60">
                <span className="text-slate-400 uppercase">NEXT STOP:</span>
                <span className="text-slate-200">{selectedVehicle.nextStop}</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-slate-800/60">
                <span className="text-slate-400 uppercase">ETA:</span>
                <span className="text-white font-bold">{selectedVehicle.eta}</span>
              </div>
              <div className="flex justify-between py-1.5">
                <span className="text-slate-400 uppercase">PAYLOAD CAPACITY:</span>
                <span className="text-slate-200">
                  {selectedVehicle.currentLoadKg} / {selectedVehicle.capacityKg} kg
                </span>
              </div>
            </div>

            <Button
              onClick={() => setSelectedVehicle(null)}
              className="w-full bg-slate-800 hover:bg-slate-700 text-white font-mono rounded-none"
            >
              CLOSE DRAWER
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
