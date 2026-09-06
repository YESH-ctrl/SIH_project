import React, { useState } from "react";
import { QFlowDataStore } from "@/data/qflowData";
import { LiveOperationsMap } from "./LiveOperationsMap";
import { Button } from "@/components/ui/button";
import {
  Sparkles,
  Play,
  Cpu,
  AlertTriangle,
  RefreshCw,
  CheckCircle2,
  ArrowRight,
  ChevronRight,
  RotateCcw,
  Trophy,
  ShieldCheck,
} from "lucide-react";

interface JuryDemoProps {
  onFinishDemo: () => void;
}

export function JuryDemoWizard({ onFinishDemo }: JuryDemoProps) {
  const [currentStep, setCurrentStep] = useState(1);
  const [incidentInjected, setIncidentInjected] = useState(false);
  const [reoptimized, setReoptimized] = useState(false);

  const steps = [
    { num: 1, name: "Network", desc: "Load City & Fleet Data" },
    { num: 2, name: "Traffic", desc: "Start Network Simulation" },
    { num: 3, name: "Optimize", desc: "Execute QPSO Solver" },
    { num: 4, name: "Dispatch", desc: "Dispatch Fleet Routes" },
    { num: 5, name: "Incident", desc: "Inject E17 Traffic Accident" },
    { num: 6, name: "Reoptimize", desc: "Warm-Start Zone Re-route" },
    { num: 7, name: "Results", desc: "Executive Adaptation Summary" },
  ];

  return (
    <div className="space-y-4 font-sans text-white">
      {/* SIH Jury Mode Header Banner */}
      <div className="p-4 bg-gradient-to-r from-amber-950/40 via-[#0d1015] to-[#0d1015] border border-amber-500/40 font-mono text-xs space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Sparkles size={16} className="text-amber-400" />
            <span className="font-extrabold text-amber-300 text-sm tracking-tight uppercase">
              SIH 2026 JURY GUIDED DEMONSTRATION MODE
            </span>
          </div>
          <span className="text-[10px] text-amber-400 bg-amber-400/10 px-2 py-0.5 border border-amber-400/30">
            30–60 SECOND GUIDED WORKFLOW
          </span>
        </div>

        {/* 7-Step Progress Indicator */}
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2 pt-1">
          {steps.map((s) => {
            const isCurrent = currentStep === s.num;
            const isDone = currentStep > s.num;
            return (
              <div
                key={s.num}
                onClick={() => setCurrentStep(s.num)}
                className={`p-2 border cursor-pointer text-left transition-all ${
                  isDone
                    ? "bg-emerald-500/10 border-emerald-500/40 text-emerald-400 font-bold"
                    : isCurrent
                    ? "bg-amber-500 text-black border-amber-400 font-bold shadow-md"
                    : "bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200"
                }`}
              >
                <div className="text-[9px] uppercase flex items-center justify-between">
                  <span>STEP 0{s.num}</span>
                  {isDone ? <CheckCircle2 size={11} /> : null}
                </div>
                <div className="font-bold text-xs truncate">{s.name}</div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Guided Step Panels */}
      <div className="bg-[#0d1015] border border-slate-800 p-6 font-mono text-xs space-y-6">
        {/* STEP 1 — NETWORK */}
        {currentStep === 1 && (
          <div className="space-y-4">
            <div className="border-b border-slate-800 pb-2">
              <span className="text-xs text-amber-400 font-bold uppercase">STEP 01 OF 07</span>
              <h2 className="text-lg font-bold text-white uppercase">LOAD TRANSPORTATION NETWORK</h2>
            </div>
            <div className="grid grid-cols-3 gap-3 text-[11px]">
              <div className="p-3 bg-slate-900 border border-slate-800">
                <span className="text-slate-400 block text-[9px]">CITY MODEL</span>
                <span className="font-bold text-white">Rajpur Urban Model</span>
              </div>
              <div className="p-3 bg-slate-900 border border-slate-800">
                <span className="text-slate-400 block text-[9px]">FLEET SIZE</span>
                <span className="font-bold text-sky-400">40 Vehicles</span>
              </div>
              <div className="p-3 bg-slate-900 border border-slate-800">
                <span className="text-slate-400 block text-[9px]">DELIVERY STOPS</span>
                <span className="font-bold text-indigo-400">300 Customer Stops</span>
              </div>
            </div>

            <Button
              onClick={() => setCurrentStep(2)}
              className="bg-amber-500 hover:bg-amber-600 text-black font-bold uppercase px-6 py-3 rounded-none text-xs flex items-center space-x-2"
            >
              <span>LOAD NETWORK & PROCEED</span>
              <ArrowRight size={14} />
            </Button>
          </div>
        )}

        {/* STEP 2 — TRAFFIC */}
        {currentStep === 2 && (
          <div className="space-y-4">
            <div className="border-b border-slate-800 pb-2">
              <span className="text-xs text-amber-400 font-bold uppercase">STEP 02 OF 07</span>
              <h2 className="text-lg font-bold text-white uppercase">INITIALIZE DYNAMIC TRAFFIC MODEL</h2>
            </div>
            <div className="grid grid-cols-3 gap-3 text-[11px]">
              <div className="p-3 bg-slate-900 border border-slate-800">
                <span className="text-slate-400 block text-[9px]">TRAFFIC FLOW</span>
                <span className="font-bold text-emerald-400">1,240 veh/h</span>
              </div>
              <div className="p-3 bg-slate-900 border border-slate-800">
                <span className="text-slate-400 block text-[9px]">AVERAGE SPEED</span>
                <span className="font-bold text-white">32 km/h</span>
              </div>
              <div className="p-3 bg-slate-900 border border-slate-800">
                <span className="text-slate-400 block text-[9px]">CONGESTION LEVEL</span>
                <span className="font-bold text-amber-400">MODERATE (38%)</span>
              </div>
            </div>

            <Button
              onClick={() => setCurrentStep(3)}
              className="bg-amber-500 hover:bg-amber-600 text-black font-bold uppercase px-6 py-3 rounded-none text-xs flex items-center space-x-2"
            >
              <span>START SIMULATION & PROCEED</span>
              <ArrowRight size={14} />
            </Button>
          </div>
        )}

        {/* STEP 3 — OPTIMIZATION */}
        {currentStep === 3 && (
          <div className="space-y-4">
            <div className="border-b border-slate-800 pb-2">
              <span className="text-xs text-amber-400 font-bold uppercase">STEP 03 OF 07</span>
              <h2 className="text-lg font-bold text-white uppercase">RUN QUANTUM-INSPIRED OPTIMIZATION (QPSO)</h2>
            </div>
            <div className="p-4 bg-emerald-500/10 border border-emerald-500/30 text-emerald-300">
              QPSO Solver will optimize all 40 vehicles collectively against shared road capacity in 8.4 seconds.
            </div>

            <Button
              onClick={() => setCurrentStep(4)}
              className="bg-emerald-500 hover:bg-emerald-600 text-black font-bold uppercase px-6 py-3 rounded-none text-xs flex items-center space-x-2"
            >
              <Cpu size={15} />
              <span>OPTIMIZE FLEET NOW</span>
            </Button>
          </div>
        )}

        {/* STEP 4 — DISPATCH */}
        {currentStep === 4 && (
          <div className="space-y-4">
            <div className="border-b border-slate-800 pb-2">
              <span className="text-xs text-amber-400 font-bold uppercase">STEP 04 OF 07</span>
              <h2 className="text-lg font-bold text-white uppercase">DISPATCH OPTIMIZED ROUTES</h2>
            </div>
            <div className="p-3 bg-slate-900 border border-slate-800 text-emerald-400 font-bold">
              ✓ 40 Vehicles Dispatched • Total Travel Time 298.4 min (-21.8% Saved)
            </div>

            <Button
              onClick={() => setCurrentStep(5)}
              className="bg-amber-500 hover:bg-amber-600 text-black font-bold uppercase px-6 py-3 rounded-none text-xs flex items-center space-x-2"
            >
              <span>DISPATCH ROUTES & PROCEED</span>
              <ArrowRight size={14} />
            </Button>
          </div>
        )}

        {/* STEP 5 — INCIDENT */}
        {currentStep === 5 && (
          <div className="space-y-4">
            <div className="border-b border-slate-800 pb-2">
              <span className="text-xs text-red-400 font-bold uppercase">STEP 05 OF 07</span>
              <h2 className="text-lg font-bold text-white uppercase">INJECT TRAFFIC DISRUPTION</h2>
            </div>
            <div className="p-4 bg-red-500/10 border border-red-500/40 text-red-300 space-y-1">
              <div className="font-bold flex items-center">
                <AlertTriangle size={15} className="mr-1.5" /> 🚨 TRAFFIC INCIDENT DETECTED ON EXPRESSWAY E17
              </div>
              <div className="text-xs font-sans text-slate-300">
                Accident created severe bottleneck (+78% Delay). 6 Vehicles & 4 Routes Affected.
              </div>
            </div>

            <Button
              onClick={() => {
                setIncidentInjected(true);
                setCurrentStep(6);
              }}
              className="bg-red-500 hover:bg-red-600 text-white font-bold uppercase px-6 py-3 rounded-none text-xs flex items-center space-x-2"
            >
              <AlertTriangle size={15} />
              <span>SIMULATE ACCIDENT NOW</span>
            </Button>
          </div>
        )}

        {/* STEP 6 — REOPTIMIZATION */}
        {currentStep === 6 && (
          <div className="space-y-4">
            <div className="border-b border-slate-800 pb-2">
              <span className="text-xs text-emerald-400 font-bold uppercase">STEP 06 OF 07</span>
              <h2 className="text-lg font-bold text-white uppercase">WARM-START DYNAMIC REOPTIMIZATION</h2>
            </div>
            <div className="p-4 bg-emerald-950/40 border border-emerald-500/40 text-emerald-300 space-y-1">
              <div className="font-bold">✓ WARM-START QPSO EXECUTED (~2.1s)</div>
              <div className="text-xs font-sans text-slate-300">
                Reused previous particle swarm population state. Vehicle V-007 re-routed around E17 via Clear Bypass E15.
              </div>
            </div>

            <Button
              onClick={() => {
                setReoptimized(true);
                setCurrentStep(7);
              }}
              className="bg-emerald-500 hover:bg-emerald-600 text-black font-bold uppercase px-6 py-3 rounded-none text-xs flex items-center space-x-2"
            >
              <RefreshCw size={15} />
              <span>EXECUTE WARM-START REOPTIMIZATION</span>
            </Button>
          </div>
        )}

        {/* STEP 7 — RESULTS */}
        {currentStep === 7 && (
          <div className="space-y-6">
            <div className="border-b border-slate-800 pb-2 flex justify-between items-center">
              <div>
                <span className="text-xs text-emerald-400 font-bold uppercase">STEP 07 OF 07</span>
                <h2 className="text-lg font-bold text-white uppercase">SYSTEM ADAPTATION RESULTS</h2>
              </div>
              <Trophy size={20} className="text-amber-400" />
            </div>

            {/* Powerful Summary Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
              <div className="p-3 bg-slate-900 border border-slate-800">
                <span className="text-slate-400 block text-[9px]">FLEET OPTIMIZED</span>
                <span className="text-xl font-bold text-emerald-400">40 / 40</span>
              </div>
              <div className="p-3 bg-slate-900 border border-slate-800">
                <span className="text-slate-400 block text-[9px]">INCIDENT ADAPTATION</span>
                <span className="text-xl font-bold text-emerald-400">6 Vehicles Rerouted</span>
              </div>
              <div className="p-3 bg-slate-900 border border-slate-800">
                <span className="text-slate-400 block text-[9px]">REOPTIMIZATION TIME</span>
                <span className="text-xl font-bold text-sky-400">2.1 sec</span>
              </div>
              <div className="p-3 bg-slate-900 border border-slate-800">
                <span className="text-slate-400 block text-[9px]">CONSTRAINT VIOLATIONS</span>
                <span className="text-xl font-bold text-emerald-400">0 Violations</span>
              </div>
            </div>

            {/* Executive Final Banner */}
            <div className="p-5 bg-gradient-to-r from-emerald-950/60 to-slate-900 border border-emerald-500/50 space-y-3">
              <div className="font-mono text-base font-extrabold text-white uppercase">
                Q-FLOW: "From static routing to adaptive fleet intelligence."
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs font-sans text-slate-300">
                <div className="flex items-center text-emerald-400">
                  <ShieldCheck size={14} className="mr-1.5" /> Fleet optimized for shared road capacity
                </div>
                <div className="flex items-center text-emerald-400">
                  <ShieldCheck size={14} className="mr-1.5" /> Dynamic traffic congestion anticipated
                </div>
                <div className="flex items-center text-emerald-400">
                  <ShieldCheck size={14} className="mr-1.5" /> Traffic incident detected automatically
                </div>
                <div className="flex items-center text-emerald-400">
                  <ShieldCheck size={14} className="mr-1.5" /> Warm-start local re-optimization (~2.1s)
                </div>
              </div>

              <div className="pt-2 flex items-center space-x-3 font-mono">
                <Button
                  onClick={onFinishDemo}
                  className="bg-emerald-500 hover:bg-emerald-600 text-black font-bold text-xs uppercase px-6 py-3 rounded-none"
                >
                  RETURN TO FULL OPERATIONS
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Live Operational Map View inside Guided Wizard */}
        <div className="h-[340px]">
          <LiveOperationsMap
            highlightAffectedRoutes={incidentInjected}
            reroutedVehicleId={reoptimized ? "V-007" : null}
          />
        </div>
      </div>
    </div>
  );
}
