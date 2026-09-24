// QSwarm style reminder: architecture is a moving pipeline, not a vertical stack of generic cards. Make flow direction and stage responsibility explicit.

import { useState } from "react";
import { ArrowDown, ArrowRight } from "lucide-react";
import { architectureStages } from "@/data/demo";

export function ArchitectureDiagram() {
  const [selected, setSelected] = useState(architectureStages[0]);

  return (
    <div className="architecture-wrap">
      <div className="architecture-pipeline" aria-label="QSwarm system architecture">
        {architectureStages.map((stage, index) => (
          <div className="architecture-stage-wrap" key={stage.id}>
            <button className={`architecture-stage ${selected.id === stage.id ? "is-selected" : ""}`} onClick={() => setSelected(stage)} onMouseEnter={() => setSelected(stage)} aria-pressed={selected.id === stage.id}>
              <span>{stage.number}</span>
              <strong>{stage.label}</strong>
              <small>{stage.short}</small>
            </button>
            {index < architectureStages.length - 1 && <div className="architecture-connector" aria-hidden="true"><ArrowRight className="architecture-connector__desktop" size={15} /><ArrowDown className="architecture-connector__mobile" size={15} /></div>}
          </div>
        ))}
      </div>
      <aside className="architecture-detail" aria-live="polite">
        <div className="architecture-detail__top"><span>STAGE {selected.number}</span><span className="live-chip"><i /> SIGNAL ACTIVE</span></div>
        <h3>{selected.label}</h3>
        <p>{selected.description}</p>
        <div className="architecture-io"><div><span>INPUT</span><strong>{selected.input}</strong></div><div><span>OUTPUT</span><strong>{selected.output}</strong></div></div>
      </aside>
    </div>
  );
}
