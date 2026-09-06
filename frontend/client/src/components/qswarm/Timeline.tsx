// QSwarm style reminder: timelines should read like race control telemetry—compact, directional, and grounded in a single simulated morning.

import { useState } from "react";
import { timeline } from "@/data/demo";

type TimelineProps = { onPhaseChange?: (phase: string) => void };

export function Timeline({ onPhaseChange }: TimelineProps) {
  const [selected, setSelected] = useState(0);
  const active = timeline[selected];

  const choose = (index: number) => {
    setSelected(index);
    onPhaseChange?.(timeline[index].phase);
  };

  return (
    <div className="timeline-module">
      <div className="timeline-visual" style={{ backgroundImage: "url('/assets/qswarm-aerial-intersection.webp')" }}>
        <div className="timeline-visual__scrim" />
        <div className="timeline-visual__status"><span>RAJPUR / SIMULATION</span><strong>{active.time}</strong></div>
        <div className={`timeline-pulse timeline-pulse--${active.phase}`} />
        <div className="timeline-visual__caption"><span>ACTIVE PHASE</span><strong>{active.label}</strong><p>{active.detail}</p></div>
      </div>
      <div className="timeline-track">
        {timeline.map((item, index) => <button key={`${item.time}-${item.label}`} className={`timeline-point ${selected === index ? "is-active" : ""}`} onClick={() => choose(index)} aria-pressed={selected === index}><span className="timeline-point__time">{item.time}</span><span className="timeline-point__dot" /><span className="timeline-point__label">{item.label}</span></button>)}
      </div>
    </div>
  );
}
