import React, { useState } from "react";
import { QFlowDataStore, TrafficSegment } from "@/data/qflowData";
import { LiveOperationsMap } from "./LiveOperationsMap";
import { Map, Layers, Navigation, Activity, Gauge, X } from "lucide-react";

export function NetworkMapPage() {
  const [selectedRoad, setSelectedRoad] = useState<TrafficSegment | null>(
    QFlowDataStore.trafficSegments[0] // Express E17
  );

  return (
    <div className="space-y-4 font-sans text-white">
      <div className="pb-2 border-b border-slate-800 flex justify-between items-center">
        <div>
          <h1 className="text-xl font-bold font-mono text-white tracking-tight uppercase flex items-center">
            <Map size={20} className="mr-2 text-sky-400" /> TRANSPORTATION NETWORK MODEL
          </h1>
          <p className="text-xs text-slate-400 font-sans">
            Interactive OSM graph representation for Rajpur Urban Network.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 h-[560px]">
        <div className="lg:col-span-8 h-full">
          <LiveOperationsMap onSelectRoad={(road) => setSelectedRoad(road)} />
        </div>

        <div className="lg:col-span-4 bg-[#0d1015] border border-slate-800 p-4 font-mono text-xs space-y-4">
          <div className="border-b border-slate-800 pb-2 flex justify-between items-center">
            <span className="font-bold text-white uppercase tracking-wider">ROAD SEGMENT INSPECTOR</span>
            <span className="text-[10px] text-sky-400">OSM GRAPH NODE</span>
          </div>

          {selectedRoad ? (
            <div className="space-y-3">
              <div className="p-3 bg-slate-900 border border-slate-800">
                <span className="text-[10px] text-slate-400 uppercase">SEGMENT NAME</span>
                <div className="font-bold text-white text-sm">{selectedRoad.roadName}</div>
                <div className="text-[10px] text-slate-500 font-sans mt-0.5">Segment ID: {selectedRoad.id}</div>
              </div>

              <div className="grid grid-cols-2 gap-2 text-[11px]">
                <div className="p-2 bg-slate-900 border border-slate-800">
                  <span className="text-slate-400 block text-[9px] uppercase">SEGMENT LENGTH</span>
                  <span className="font-bold text-white">{selectedRoad.lengthKm} km</span>
                </div>

                <div className="p-2 bg-slate-900 border border-slate-800">
                  <span className="text-slate-400 block text-[9px] uppercase">CURRENT SPEED</span>
                  <span className="font-bold text-amber-400">{selectedRoad.currentSpeedKmh} km/h</span>
                </div>

                <div className="p-2 bg-slate-900 border border-slate-800">
                  <span className="text-slate-400 block text-[9px] uppercase">FREE FLOW SPEED</span>
                  <span className="font-bold text-emerald-400">{selectedRoad.freeFlowSpeedKmh} km/h</span>
                </div>

                <div className="p-2 bg-slate-900 border border-slate-800">
                  <span className="text-slate-400 block text-[9px] uppercase">TRAFFIC FLOW</span>
                  <span className="font-bold text-white">{selectedRoad.flowVehHr} / {selectedRoad.capacityVehHr} v/h</span>
                </div>
              </div>

              <div className="p-3 bg-slate-900 border border-slate-800 space-y-1">
                <div className="text-[10px] text-slate-400 uppercase">CONGESTION LEVEL</div>
                <div className="font-bold text-red-400 text-sm uppercase">{selectedRoad.congestionLevel}</div>
                <div className="text-[10px] text-slate-400 font-sans">
                  Predicted travel time: <strong className="text-white">{selectedRoad.predictedTravelTimeMin} min</strong>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-slate-500 text-center py-12">Click a road segment on the map to inspect telemetry</div>
          )}
        </div>
      </div>
    </div>
  );
}
