import React, { useState, useEffect } from "react";
import { QFlowDataStore } from "@/data/qflowData";
import { LiveOperationsMap } from "./LiveOperationsMap";
import { Button } from "@/components/ui/button";
import {
  RefreshCw,
  Zap,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  ShieldCheck,
  RotateCcw,
  Navigation,
  Clock,
  Activity,
  Layers,
} from "lucide-react";

export function ReoptimizationPage() {
  const [isRunning, setIsRunning] = useState(true);
  const [step, setStep] = useState(1);

  useEffect(() => {
    if (isRunning && step < 6) {
      const timer = setInterval(() => {
        setStep((prev) => {
          if (prev >= 6) {
            setIsRunning(false);
            return 6;
          }
          return prev + 1;
        });
      }, 700);
      return () => clearInterval(timer);
    }
  }, [isRunning, step]);

  const reoptStages = [
    { num: 1, title: "INCIDENT DETECTED", desc: "Accident on Express E17 (+78% Delay)" },
    { num: 2, title: "IMPACT ANALYSIS", desc: "6 Vehicles & 4 Routes Identified" },
    { num: 3, title: "LOAD PREVIOUS STATE", desc: "Warm-Start Population Cached" },
    { num: 4, title: "WARM-START QPSO", desc: "Local Zone Swarm Re-routing" },
    { num: 5, title: "CONSTRAINTS VALIDATED", desc: "0 Axle / Capacity Violations" },
    { num: 6, title: "DISPATCH UPDATED", desc: "New Routes Dispatched ~2.1s" },
  ];

  return (
    <div className="space-y-4 font-sans text-white">
      {/* Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-800">
        <div>
          <h1 className="text-xl font-bold font-mono text-white tracking-tight uppercase flex items-center">
            <RefreshCw size={20} className="mr-2 text-emerald-400" /> DYNAMIC WARM-START REOPTIMIZATION
          </h1>
          <p className="text-xs text-slate-400 font-sans">
            Event-triggered local re-optimization reusing previous particle swarm population state.
          </p>
        </div>

        <div className="flex items-center space-x-2 font-mono text-xs">
          <span className="px-3 py-1.5 bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 font-bold uppercase">
            STATUS: INCIDENT RESPONSE ACTIVE
          </span>
          <Button
            onClick={() => {
              setStep(1);
              setIsRunning(true);
            }}
            variant="outline"
            className="border-slate-700 bg-slate-800 hover:bg-slate-700 text-white rounded-none"
          >
            <RotateCcw size={13} className="mr-1.5" /> RE-RUN WARM START
          </Button>
        </div>
      </div>

      {/* Dynamic Workflow Stage Bar */}
      <div className="p-4 bg-[#0d1015] border border-slate-800 font-mono text-xs space-y-3">
        <div className="flex justify-between items-center text-[10px] text-slate-400 font-bold uppercase">
          <span>EVENT REOPTIMIZATION PIPELINE STAGES</span>
          <span className="text-emerald-400">WARM-START MODE • REUSED STATE</span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
          {reoptStages.map((s) => {
            const isCurrent = step === s.num;
            const isDone = step > s.num;
            return (
              <div
                key={s.num}
                className={`p-2.5 border text-left transition-all ${
                  isDone
                    ? "bg-emerald-500/10 border-emerald-500/40 text-emerald-400"
                    : isCurrent
                    ? "bg-sky-500/20 border-sky-400 text-white animate-pulse"
                    : "bg-slate-900 border-slate-800 text-slate-500"
                }`}
              >
                <div className="text-[9px] uppercase font-bold flex items-center justify-between">
                  <span>STAGE 0{s.num}</span>
                  {isDone ? <CheckCircle2 size={12} /> : isCurrent ? <RefreshCw size={12} className="animate-spin" /> : null}
                </div>
                <div className="font-bold text-xs mt-1 text-slate-100">{s.title}</div>
                <div className="text-[9px] text-slate-400 font-sans mt-0.5">{s.desc}</div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Cold Start vs Warm Start Comparison Architecture */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 font-mono text-xs">
        {/* Cold Start Panel */}
        <div className="p-4 bg-slate-950 border border-slate-800 space-y-2 opacity-60">
          <div className="text-[10px] text-slate-400 font-bold uppercase flex justify-between">
            <span>COLD START (TRADITIONAL)</span>
            <span className="text-red-400">SLOW • 18.4s</span>
          </div>
          <div className="p-2.5 bg-slate-900 border border-slate-800 text-[11px] text-slate-300">
            Random Initialization → Full Global Search → Re-calculate All 40 Vehicles → High Latency
          </div>
        </div>

        {/* Warm Start Panel */}
        <div className="p-4 bg-emerald-950/20 border border-emerald-500/40 space-y-2">
          <div className="text-[10px] text-emerald-400 font-bold uppercase flex justify-between">
            <span>WARM START (Q-FLOW QPSO)</span>
            <span className="text-emerald-400 font-extrabold">FAST • 2.1s</span>
          </div>
          <div className="p-2.5 bg-emerald-500/10 border border-emerald-500/30 text-[11px] text-emerald-200">
            ✓ Previous Solution State Reused → Affected Zone Modification (E17 Bypass) → Focused Search → Instant Dispatch
          </div>
        </div>
      </div>

      {/* Before / After Split Screen Adaptation View */}
      <div className="bg-[#0d1015] border border-slate-800 p-4 font-mono text-xs space-y-4">
        <div className="flex items-center justify-between border-b border-slate-800 pb-2">
          <span className="font-bold text-white uppercase tracking-wider">
            ROUTE ADAPTATION COMPARISON (VEHICLE V-007)
          </span>
          <span className="text-[10px] text-emerald-400">REROUTED AROUND E17 INCIDENT VIA E15</span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* BEFORE INCIDENT */}
          <div className="p-4 bg-slate-950 border border-red-500/30 space-y-3">
            <div className="flex items-center justify-between text-red-400 font-bold text-xs border-b border-slate-800 pb-1.5">
              <span>BEFORE REOPTIMIZATION (CONGESTED)</span>
              <span className="text-[9px] uppercase px-1.5 bg-red-500/20">AFFECTED</span>
            </div>

            <div className="space-y-1.5 text-[11px]">
              <div className="flex justify-between text-slate-300">
                <span className="text-slate-400">VEHICLE:</span>
                <span className="font-bold text-white">Vehicle V-007</span>
              </div>
              <div className="flex justify-between text-slate-300">
                <span className="text-slate-400">ORIGINAL ROUTE:</span>
                <span className="text-red-400 font-bold">Depot 01 → C12 → C18 → E17 (Accident) → C24 → Depot 01</span>
              </div>
              <div className="flex justify-between text-slate-300">
                <span className="text-slate-400">ESTIMATED TRAVEL TIME:</span>
                <span className="text-red-400 font-bold">48 min (Delayed +16 min)</span>
              </div>
              <div className="flex justify-between text-slate-300">
                <span className="text-slate-400">ROAD CONGESTION:</span>
                <span className="text-red-400 font-bold">Severe (Express E17 Bottleneck)</span>
              </div>
            </div>
          </div>

          {/* AFTER REOPTIMIZATION */}
          <div className="p-4 bg-slate-950 border border-emerald-500/40 space-y-3">
            <div className="flex items-center justify-between text-emerald-400 font-bold text-xs border-b border-slate-800 pb-1.5">
              <span>AFTER WARM-START REOPTIMIZATION</span>
              <span className="text-[9px] uppercase px-1.5 bg-emerald-500/20">OPTIMIZED</span>
            </div>

            <div className="space-y-1.5 text-[11px]">
              <div className="flex justify-between text-slate-300">
                <span className="text-slate-400">VEHICLE:</span>
                <span className="font-bold text-white">Vehicle V-007</span>
              </div>
              <div className="flex justify-between text-slate-300">
                <span className="text-slate-400">ADAPTED ROUTE:</span>
                <span className="text-emerald-400 font-bold">Depot 01 → C12 → C18 → E15 (Clear Bypass) → C24 → Depot 01</span>
              </div>
              <div className="flex justify-between text-slate-300">
                <span className="text-slate-400">REOPTIMIZED TRAVEL TIME:</span>
                <span className="text-emerald-400 font-bold">34 min (Saved 14 min)</span>
              </div>
              <div className="flex justify-between text-slate-300">
                <span className="text-slate-400">ROAD CONGESTION:</span>
                <span className="text-emerald-400 font-bold">Clear (Bypassed E17 Corridor)</span>
              </div>
            </div>
          </div>
        </div>

        {/* Live Route Adaptation Map View */}
        <div className="h-[320px]">
          <LiveOperationsMap
            highlightAffectedRoutes={true}
            reroutedVehicleId="V-007"
          />
        </div>
      </div>
    </div>
  );
}
