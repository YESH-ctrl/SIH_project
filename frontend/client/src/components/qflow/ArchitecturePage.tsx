import React, { useState } from "react";
import { GitBranch, Layers, ArrowRight, Cpu, CheckCircle2, ChevronRight, X } from "lucide-react";

export function ArchitecturePage() {
  const [selectedNode, setSelectedNode] = useState<{ title: string; desc: string; input: string; output: string } | null>(null);

  const archNodes = [
    {
      title: "OPENSTREETMAP",
      subtitle: "OSM Data Extraction",
      desc: "Downloads spatial road network geometries and node coordinates for Rajpur urban region.",
      input: "OpenStreetMap PBF / Overpass API",
      output: "Raw Spatial Road Network XML",
    },
    {
      title: "NETWORK GRAPH",
      subtitle: "OSMnx & NetworkX",
      desc: "Constructs directed multi-graph representing road segments, intersections, and edge speeds.",
      input: "Raw Spatial Road Network",
      output: "NetworkX MultiDiGraph (Nodes & Edges)",
    },
    {
      title: "SUMO SIMULATION",
      subtitle: "Microscopic Traffic Engine",
      desc: "Simulates vehicle accelerations, queueing delays, and multi-modal traffic interactions.",
      input: "Network Graph & Demand Matrix",
      output: "Live Speed & Congestion Telemetry",
    },
    {
      title: "TRAFFIC STATE",
      subtitle: "Dynamic State Estimation",
      desc: "Aggregates real-time sensor speeds, vehicle densities, and congestion indices across network segments.",
      input: "SUMO & GPS Telemetry",
      output: "Current Network Congestion Matrix",
    },
    {
      title: "TRAFFIC PREDICTION",
      subtitle: "Short-Term Forecast Model",
      desc: "Predicts travel time delays across 5, 10, and 15-minute horizons to prevent bottlenecking.",
      input: "Historical & Current State",
      output: "Predicted Road Weight Matrix",
    },
    {
      title: "VRP FORMULATION",
      subtitle: "Multi-Depot VRP",
      desc: "Formulates 40-vehicle fleet routing problem with time windows and multi-depot pickups.",
      input: "Demand Points & Fleet Specs",
      output: "Discrete VRP Solution Vector Space",
    },
    {
      title: "QPSO OPTIMIZATION",
      subtitle: "Quantum-Inspired PSO",
      desc: "Evaluates collective particle swarm candidates across discrete route assignments.",
      input: "Predicted Matrix & VRP Space",
      output: "Global Best Fitness Solution Candidate",
    },
    {
      title: "CONSTRAINT CHECK",
      subtitle: "Hard Constraint Filter",
      desc: "Enforces 7.5T heavy-vehicle axle limits, bridge clearance, and customer time windows.",
      input: "Candidate Routes",
      output: "Feasible Route Candidate Subset",
    },
    {
      title: "CONGESTION EVAL",
      subtitle: "System Load Minimizer",
      desc: "Calculates total system travel time reduction across all 40 vehicles simultaneously.",
      input: "Feasible Routes",
      output: "Validated System Objective Value",
    },
    {
      title: "ROUTE DISPATCH",
      subtitle: "Fleet Execution",
      desc: "Pushes optimized turn-by-turn route assignments to fleet vehicle telematics.",
      input: "Validated System Objective",
      output: "Active Fleet Route Instructions",
    },
    {
      title: "EVENT DETECTION",
      subtitle: "Disruption Monitor",
      desc: "Monitors unexpected accidents or road closures triggering automatic local re-routing.",
      input: "Live Road Sensors & Driver Alerts",
      output: "Incident Disruption Signal",
    },
    {
      title: "WARM-START REOPT",
      subtitle: "Local Zone Swarm Re-use",
      desc: "Reuses cached QPSO particle swarm population to re-optimize affected routes in ~2.1s.",
      input: "Incident Signal & Cached Swarm",
      output: "Re-optimized Bypass Routes",
    },
  ];

  return (
    <div className="space-y-4 font-sans text-white">
      {/* Title */}
      <div className="pb-2 border-b border-slate-800">
        <h1 className="text-xl font-bold font-mono text-white tracking-tight uppercase flex items-center">
          <GitBranch size={20} className="mr-2 text-sky-400" /> SYSTEM TECHNICAL ARCHITECTURE
        </h1>
        <p className="text-xs text-slate-400 font-sans">
          Interactive technical pipeline demonstrating data flow from OpenStreetMap to Quantum-Inspired Swarm Dispatch.
        </p>
      </div>

      {/* Architecture Pipeline Map Grid */}
      <div className="bg-[#0d1015] border border-slate-800 p-5 font-mono text-xs space-y-4">
        <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider flex items-center justify-between">
          <span>Q-FLOW END-TO-END PIPELINE NODES (CLICK NODE FOR TECHNICAL DETAILS)</span>
          <span className="text-emerald-400">12 STAGES • FULLY DECOUPLED</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
          {archNodes.map((node, idx) => (
            <div
              key={node.title}
              onClick={() => setSelectedNode(node)}
              className="p-3 bg-slate-900 border border-slate-800 hover:border-sky-400 cursor-pointer transition-all space-y-1.5 group"
            >
              <div className="flex items-center justify-between text-[10px]">
                <span className="text-sky-400 font-bold">0{idx + 1}</span>
                <span className="text-slate-500 group-hover:text-slate-300 transition-colors">CLICK TO INSPECT</span>
              </div>
              <div className="font-bold text-white text-xs group-hover:text-sky-400 transition-colors">
                {node.title}
              </div>
              <div className="text-[10px] text-slate-400 font-sans">{node.subtitle}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Technical Detail Modal */}
      {selectedNode && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#0c0e12] border border-slate-700 p-6 max-w-lg w-full font-mono text-xs space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center space-x-2">
                <GitBranch size={16} className="text-sky-400" />
                <span className="font-bold text-white text-sm">{selectedNode.title}</span>
              </div>
              <button onClick={() => setSelectedNode(null)} className="text-slate-400 hover:text-white">
                <X size={16} />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <span className="text-[10px] text-slate-400 uppercase font-bold block">DESCRIPTION</span>
                <p className="text-xs text-slate-200 font-sans mt-1 leading-relaxed">{selectedNode.desc}</p>
              </div>

              <div className="p-3 bg-slate-900 border border-slate-800 space-y-2 text-[11px]">
                <div>
                  <span className="text-[9px] text-slate-400 uppercase block">INPUT DATA:</span>
                  <span className="text-sky-400 font-bold">{selectedNode.input}</span>
                </div>
                <div>
                  <span className="text-[9px] text-slate-400 uppercase block">OUTPUT DATA:</span>
                  <span className="text-emerald-400 font-bold">{selectedNode.output}</span>
                </div>
              </div>
            </div>

            <button
              onClick={() => setSelectedNode(null)}
              className="w-full py-2 bg-slate-800 hover:bg-slate-700 text-white font-mono rounded-none"
            >
              CLOSE DETAILS
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
