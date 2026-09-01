// QSwarm style reminder: teach QPSO through motion and system language first; keep the equation secondary and expandable.

import { useState } from "react";
import { ChevronDown } from "lucide-react";

const steps = [
  ["01", "INITIALIZE", "Candidate fleet assignments"],
  ["02", "DECODE", "Random-key vectors → discrete routes"],
  ["03", "EVALUATE", "System-wide fitness"],
  ["04", "UPDATE", "Particle positions"],
  ["05", "REPAIR", "2-opt / Or-opt local search"],
  ["06", "EXCHANGE", "Elite boundary solutions"],
  ["07", "CONVERGE", "Feasible fleet assignment"],
];

export function OptimizationPanel() {
  const [technicalOpen, setTechnicalOpen] = useState(false);
  return (
    <div className="optimization-module">
      <div className="optimization-visual" style={{ backgroundImage: "url('/assets/qswarm-optimization-landscape.webp')" }}>
        <div className="optimization-visual__overlay" />
        <div className="optimization-visual__label"><span>PARTICLE FIELD</span><strong>SEARCH / REPAIR / EXCHANGE</strong></div>
        <div className="particle-orbit particle-orbit--one" /><div className="particle-orbit particle-orbit--two" /><div className="particle-orbit particle-orbit--three" />
        <span className="particle-tag particle-tag--a">ELITE 04</span><span className="particle-tag particle-tag--b">ZONE EAST</span>
      </div>
      <div className="optimization-steps">{steps.map(([number, title, description]) => <div className="optimization-step" key={number}><span>{number}</span><div><strong>{title}</strong><small>{description}</small></div></div>)}</div>
      <button className="technical-toggle" onClick={() => setTechnicalOpen((value) => !value)} aria-expanded={technicalOpen}><span>TECHNICAL VIEW</span><ChevronDown size={16} className={technicalOpen ? "is-open" : ""} /></button>
      {technicalOpen && <div className="technical-copy"><p>For the demo, each particle encodes a discrete fleet assignment through a random-key vector. The fitness function combines system travel time, congestion, and cost while enforcing route feasibility, heavy-vehicle constraints, and fairness across zones.</p><code>minimize  T_system + λ₁·congestion + λ₂·cost</code></div>}
    </div>
  );
}
