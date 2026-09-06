import React, { useState } from "react";
import { LiveOperationsMap } from "./LiveOperationsMap";
import { Button } from "@/components/ui/button";
import { Play, Pause, RotateCcw, AlertTriangle, FastForward, Activity } from "lucide-react";

export function SimulationPage({ onTriggerIncidentDemo }: { onTriggerIncidentDemo: () => void }) {
  const [isPlaying, setIsPlaying] = useState(true);
  const [speed, setSpeed] = useState("1x");

  return (
    <div className="space-y-4 font-sans text-white">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-800">
        <div>
          <h1 className="text-xl font-bold font-mono text-white tracking-tight uppercase flex items-center">
            <Play size={20} className="mr-2 text-emerald-400" /> TRAFFIC SIMULATION CONTROL (SUMO)
          </h1>
          <p className="text-xs text-slate-400 font-sans">
            Control live micro-simulation speeds, traffic demand matrix, and incident injection triggers.
          </p>
        </div>

        {/* Simulation Controls */}
        <div className="flex items-center space-x-2 font-mono text-xs">
          <Button
            onClick={() => setIsPlaying(!isPlaying)}
            className={`font-bold uppercase rounded-none px-3.5 py-1.5 ${
              isPlaying ? "bg-amber-500 hover:bg-amber-600 text-black" : "bg-emerald-500 hover:bg-emerald-600 text-black"
            }`}
          >
            {isPlaying ? <Pause size={13} className="mr-1" /> : <Play size={13} className="mr-1" />}
            {isPlaying ? "PAUSE" : "START"}
          </Button>

          {(["1x", "2x", "5x"] as const).map((sp) => (
            <button
              key={sp}
              onClick={() => setSpeed(sp)}
              className={`px-2.5 py-1.5 border transition-all ${
                speed === sp
                  ? "bg-slate-800 text-sky-400 font-bold border-sky-400"
                  : "bg-slate-900 text-slate-400 border-slate-800 hover:text-white"
              }`}
            >
              {sp}
            </button>
          ))}

          <Button
            onClick={onTriggerIncidentDemo}
            className="bg-red-500/20 hover:bg-red-500/30 text-red-400 border border-red-500/40 rounded-none px-3.5 py-1.5"
          >
            <AlertTriangle size={13} className="mr-1" /> ACCIDENT
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 h-[520px]">
        <div className="lg:col-span-8 h-full">
          <LiveOperationsMap />
        </div>

        <div className="lg:col-span-4 bg-[#0d1015] border border-slate-800 p-4 font-mono text-xs space-y-4">
          <div className="border-b border-slate-800 pb-2 flex justify-between items-center">
            <span className="font-bold text-white uppercase tracking-wider">SIMULATION ENGINE STATE</span>
            <span className="text-[10px] text-emerald-400">SUMO ACTIVE</span>
          </div>

          <div className="space-y-3">
            <div className="p-3 bg-slate-900 border border-slate-800 space-y-1">
              <span className="text-[9px] text-slate-400 uppercase">SIMULATION TIME</span>
              <div className="text-xl font-bold text-white">08:42:15 AM</div>
              <div className="text-[10px] text-emerald-400">Speed: {speed} Real-time</div>
            </div>

            <div className="p-3 bg-slate-900 border border-slate-800 space-y-1">
              <span className="text-[9px] text-slate-400 uppercase">TRAFFIC DEMAND MATRIX</span>
              <div className="text-sm font-bold text-white">Normal Peak (1,240 veh/h)</div>
              <div className="text-[10px] text-slate-400 font-sans">Rajpur Morning Commute Demand</div>
            </div>

            <div className="p-3 bg-slate-900 border border-slate-800 space-y-1">
              <span className="text-[9px] text-slate-400 uppercase">INCIDENT INJECTION STATE</span>
              <div className="text-sm font-bold text-red-400">Accident on Expressway E17</div>
              <div className="text-[10px] text-slate-400 font-sans">6 Vehicles Rerouted by Warm-Start QPSO</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
