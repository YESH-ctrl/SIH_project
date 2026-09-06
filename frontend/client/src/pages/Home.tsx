// QSwarm style reminder: orchestrate a race-day narrative—large type, asymmetric sections, map-led evidence, and scarce lime signal. Never collapse this into a repeated-card dashboard.

import { useState } from "react";
import { ArrowRight } from "lucide-react";
import { ArchitectureDiagram } from "@/components/qswarm/ArchitectureDiagram";
import { ConstraintPanel } from "@/components/qswarm/ConstraintPanel";
import { SectionLabel } from "@/components/qswarm/SectionLabel";
import { SiteNav } from "@/components/qswarm/SiteNav";
import { Timeline } from "@/components/qswarm/Timeline";

const techStack = ["PYTHON", "NUMPY", "NETWORKX", "OSM / OSMNX", "SUMO", "LEAFLET / MAPBOX", "QPSO", "2-OPT / OR-OPT"];

function jumpTo(id: string) {
  document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
}

export default function Home() {
  const [timelinePhase, setTimelinePhase] = useState("signal");

  return (
    <div className="qswarm-app">
      <SiteNav />
      <main>
        <section id="system" className="hero-section">
          <div className="hero-section__image" />
          <div className="hero-section__grain" />
          <div className="hero-section__content">
            <div className="hero-section__kicker"><span>SMART INDIA HACKATHON / 2026</span></div>
            <h1><span>QSWARM</span><em>QUANTUM-INSPIRED</em><span>FLEET ROUTING</span></h1>
            <div className="hero-section__statement"><p>Don’t route vehicles individually.<br /><strong>Route the city as a system.</strong></p><div className="hero-section__actions"><button className="button button--lime" onClick={() => jumpTo("architecture")}>EXPLORE ARCHITECTURE <ArrowRight size={15} /></button></div></div>
          </div>
          <div className="hero-status"><span>SYSTEM STATUS</span><strong><i className="status-dot" /> OPTIMIZATION ENGINE ONLINE</strong><small>DEMO / SIMULATION ENVIRONMENT</small></div>
          <div className="hero-coordinate">23° 10′ N&nbsp;&nbsp; 79° 56′ E<br /><span>RAJPUR / NETWORK MODEL</span></div>
        </section>

        <section id="problem" className="story-section problem-section">
          <div className="section-shell">
            <SectionLabel number="01" eyebrow="THE FLEET PROBLEM" />
            <div className="story-header story-header--split">
              <h2>THE SHORTEST ROUTE<br />ISN’T ALWAYS<br /><span>THE BEST ROUTE.</span></h2>
              <div className="story-header__copy">
                <p>Traditional navigation systems optimize vehicles independently. At fleet scale, hundreds of individually optimal decisions can overload the same road.</p>
                <span className="body-note">55 vehicles / one selfish answer / one congestion spike</span>
              </div>
            </div>
          </div>
        </section>

        <section id="architecture" className="story-section architecture-section"><div className="section-shell"><SectionLabel number="02" eyebrow="SYSTEM ARCHITECTURE" /><div className="section-heading-row"><h2>A CITY-SCALE<br /><span>FEEDBACK LOOP.</span></h2><p>Every stage keeps the system objective in view. Hover or focus a stage to inspect its input, purpose, and output.</p></div><ArchitectureDiagram /><div className="architecture-callout"><span>FUTURE BACKEND COMPATIBILITY</span><strong>Python FastAPI → QSwarm QPSO Engine → OSMnx / NetworkX → SUMO → WebSocket → React</strong></div></div></section>

        <section className="story-section constraint-section"><div className="section-shell"><SectionLabel number="03" eyebrow="HEAVY VEHICLE CONSTRAINTS" /><div className="section-heading-row"><h2>REAL CITIES<br /><span>HAVE RULES.</span></h2><p>Fleet-scale optimization is only useful if a 7.5-ton vehicle can actually make the turn, clear the bridge, and arrive inside the time window.</p></div><ConstraintPanel /></div></section>

        <section className="story-section rajpur-section"><div className="section-shell"><SectionLabel number="04" eyebrow="THE RAJPUR DEMONSTRATION" /><div className="section-heading-row section-heading-row--wide"><h2>ONE MORNING.<br />ONE CITY.<br /><span>55 VEHICLES.</span></h2><div className="phase-readout"><span>SELECTED STATE</span><strong>{timelinePhase.toUpperCase()}</strong></div></div><Timeline onPhaseChange={setTimelinePhase} /></div></section>

        <section className="story-section difference-section"><div className="section-shell"><SectionLabel number="05" eyebrow="WHY IT IS DIFFERENT" /><div className="difference-table"><div className="difference-head"><span>TRADITIONAL ROUTING</span><span>QSWARM</span></div>{[["OPTIMIZES", "ONE VEHICLE", "THE FLEET"], ["RESPONSE", "STATIC RESPONSE", "EVENT-TRIGGERED RE-OPTIMIZATION"], ["OBJECTIVE", "SELFISH ETA", "SYSTEM-WIDE TRAVEL TIME"], ["SOLVER", "ONE GLOBAL SOLVER", "ZONE SWARMS + BOUNDARY NEGOTIATION"]].map(([label, traditional, qswarm]) => <div className="difference-row" key={label}><span className="difference-row__label">{label}</span><strong>{traditional}</strong><strong className="is-lime">{qswarm}</strong></div>)}</div></div></section>

        <section className="tech-strip-section"><div className="tech-strip__inner"><span className="tech-strip__number"></span><div className="tech-strip__marquee">{techStack.concat(techStack).map((item, index) => <span key={`${item}-${index}`}>{item}<i>×</i></span>)}</div></div></section>

        <section id="hackathon" className="story-section hackathon-section"><div className="section-shell"><SectionLabel number="07" eyebrow="HACKATHON MODE" /><div className="hackathon-layout"><div><h2>BUILT TO BE<br /><span>DEMONSTRATED.</span></h2><p className="lede">A judge should understand the problem in ten seconds, the difference in thirty, and the incident response before the demo timer runs out.</p><button className="button button--lime" onClick={() => jumpTo("architecture")}>EXPLORE ARCHITECTURE <ArrowRight size={15} /></button></div><div className="judge-flow">{[["01", "LOAD CITY"], ["02", "LOAD FLEET"], ["03", "RUN QSWARM"], ["04", "INJECT TRAFFIC EVENT"], ["05", "WATCH LOCAL RE-OPTIMIZATION"], ["06", "COMPARE RESULTS"]].map(([number, label]) => <div key={number}><span>{number}</span><strong>{label}</strong><ArrowRight size={15} /></div>)}</div></div></div></section>

      </main>
    </div>
  );
}
