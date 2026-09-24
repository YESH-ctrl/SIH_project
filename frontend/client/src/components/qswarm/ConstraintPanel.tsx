// QSwarm style reminder: constraints are visual guardrails. Use split-screen evidence, hard labels, and a repair transition instead of a generic feature list.

import { useState } from "react";
import { ArrowDown, Check, TriangleAlert } from "lucide-react";

export function ConstraintPanel() {
  const [repaired, setRepaired] = useState(false);
  return (
    <div className="constraint-module">
      <div className="constraint-image" style={{ backgroundImage: "url('/assets/qswarm-logistics-hero.webp')" }}><div className="constraint-image__scrim" /><div className="constraint-image__caption"><span>HEAVY VEHICLE / TRUCK 07</span><strong>{repaired ? "FEASIBLE ROUTE" : "RESTRICTED ENTRY"}</strong></div></div>
      <div className="constraint-engine"><span className="micro-label">CONSTRAINT ENGINE</span><h3>Routes that respect the real city.</h3><div className="constraint-tags"><span>7.5T+</span><span>OLD CITY CORE</span><span>08:00–11:00</span><span>NO ENTRY</span></div><div className={`constraint-flow ${repaired ? "is-repaired" : ""}`}><div><TriangleAlert size={17} /><strong>CONSTRAINT VIOLATION</strong></div><ArrowDown size={15} /><div><Check size={17} /><strong>ROUTE REPAIRED</strong></div><ArrowDown size={15} /><div className="constraint-flow__result"><span>✓</span><strong>FEASIBLE ROUTE</strong></div></div><button className="text-button" onClick={() => setRepaired((value) => !value)}>{repaired ? "RESET SCENARIO" : "REPAIR THIS ROUTE"} <span>↗</span></button><p>Heavy vehicles are constrained by weight, height, turning radius, restricted zones, time windows, and capacity. QSwarm repairs the route before dispatch.</p></div>
    </div>
  );
}
