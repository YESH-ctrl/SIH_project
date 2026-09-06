// QSwarm style reminder: the live map is a timing screen, not a card grid. Make system state, route flow, and incident scope visible at a glance.

import { useEffect, useMemo, useState } from "react";
import { Pause, Play, RotateCcw, TriangleAlert } from "lucide-react";
import { Algorithm, Zone, vehicles } from "@/data/demo";
import { runOptimization, simulateIncident } from "@/lib/api";
import { raipurOsmMeta } from "@/data/raipurRoutes";
import { RouteNetwork } from "./RouteNetwork";

export function SimulationMap() {
  const [running, setRunning] = useState(true);
  const [incident, setIncident] = useState(false);
  const [optimizing, setOptimizing] = useState(false);
  const [zone, setZone] = useState<Zone>("ALL");
  const [algorithm, setAlgorithm] = useState<Algorithm>("QSWARM");
  const [travelTime, setTravelTime] = useState(312);
  const [elapsed, setElapsed] = useState(0);
  const [selectedRoute, setSelectedRoute] = useState(0);
  const routeOptions = raipurOsmMeta.namedRoads.length ? raipurOsmMeta.namedRoads.slice(0, 6) : ["OSM ROUTE 01", "OSM ROUTE 02", "OSM ROUTE 03"];

  useEffect(() => {
    if (!running) return;
    const timer = window.setInterval(() => setElapsed((value) => (value + 1) % 100), 900);
    return () => window.clearInterval(timer);
  }, [running]);

  const filteredVehicles = useMemo(() => zone === "ALL" ? vehicles : vehicles.filter((vehicle) => vehicle.zone === zone), [zone]);

  const handleIncident = async () => {
    if (optimizing) return;
    setIncident(true);
    setRunning(false);
    setOptimizing(true);
    await simulateIncident();
    await runOptimization();
    setTravelTime(298);
    setOptimizing(false);
    setRunning(true);
  };

  const handleReoptimize = async () => {
    if (optimizing) return;
    setRunning(false);
    setOptimizing(true);
    await runOptimization();
    setTravelTime((value) => Math.max(286, value - 4));
    setOptimizing(false);
    setRunning(true);
  };

  return (
    <div className={`simulation-shell ${incident ? "simulation-shell--incident" : ""}`}>
      <div className="simulation-map">
        <div className="simulation-map__texture" aria-hidden="true" />
        <RouteNetwork incident={incident} optimized={algorithm === "QSWARM"} highlightedZone={zone === "ALL" ? undefined : zone} vehicleCount={55} running={running} useRaipurRoutes selectedRoute={selectedRoute} />
        <div className="simulation-zone-label simulation-zone-label--north">NORTH ZONE</div>
        <div className="simulation-zone-label simulation-zone-label--east">EAST ZONE</div>
        <div className="simulation-zone-label simulation-zone-label--west">WEST ZONE</div>
        <div className="simulation-zone-label simulation-zone-label--south">SOUTH ZONE</div>
        <div className="map-readout map-readout--fleet">
          <span className="map-readout__label">LIVE FLEET</span>
          <strong>55 <small>VEHICLES</small></strong>
          <span className="map-readout__sub">55 FLEET / {zone === "ALL" ? "ALL ZONES" : `${filteredVehicles.length} SAMPLE ROUTES`} / DEMO MODE</span>
        </div>
        <div className="map-readout map-readout--status">
          <span className="map-readout__label">SYSTEM STATUS</span>
          <strong className={optimizing ? "is-lime" : ""}><i className="status-dot" />{optimizing ? "RE-OPTIMIZING" : running ? "OPTIMIZING" : "PAUSED"}</strong>
          <span className="map-readout__sub">QPSO ENGINE / {algorithm} / {String(elapsed).padStart(2, "0")} ITER</span>
        </div>
        {incident && <div className="incident-readout"><TriangleAlert size={15} /><div><strong>RING ROAD EAST</strong><span>TRAFFIC SPEED −40% / AFFECTED ZONE: EAST</span></div></div>}
        <div className="map-legend"><span><i className="legend-dot legend-dot--free" />FREE FLOW</span><span><i className="legend-dot legend-dot--moderate" />MODERATE</span><span><i className="legend-dot legend-dot--severe" />CONGESTED</span></div>
        <div className="osm-readout"><span>OPENSTREETMAP / RAIPUR</span><a href={raipurOsmMeta.sourceUrl} target="_blank" rel="noreferrer">VIEW SOURCE ↗</a><small>RANDOM OSM WINDOW · 21.235–21.255 N · 81.625–81.650 E</small></div>
        <div className="map-metrics">
          <div><span>SYSTEM TRAVEL TIME</span><strong>{travelTime.toFixed(1)} <small>VEHICLE-HOURS</small></strong></div>
          <div><span>BASELINE</span><strong>391.0 <small>VEHICLE-HOURS</small></strong></div>
          <div className="map-metrics__improvement"><span>IMPROVEMENT</span><strong>~20<span>%</span></strong></div>
        </div>
      </div>
      <div className="simulation-controls">
        <div className="control-group control-group--transport">
          <span className="control-label">TRANSPORT</span>
          <button className={`sim-control ${running ? "is-active" : ""}`} onClick={() => setRunning(true)} disabled={optimizing} aria-pressed={running}><Play size={13} fill="currentColor" /> START</button>
          <button className={`sim-control ${!running ? "is-active" : ""}`} onClick={() => setRunning(false)} disabled={optimizing} aria-pressed={!running}><Pause size={13} fill="currentColor" /> PAUSE</button>
          <button className="sim-control sim-control--lime" onClick={handleReoptimize} disabled={optimizing}><RotateCcw size={13} /> RE-OPTIMIZE</button>
          <button className={`sim-control sim-control--incident ${incident ? "is-active" : ""}`} onClick={handleIncident} disabled={optimizing}><TriangleAlert size={13} /> {optimizing ? "RUNNING" : "SIMULATE INCIDENT"}</button>
        </div>
        <div className="control-group"><span className="control-label">ZONE</span><div className="control-segment">{(["ALL", "EAST", "WEST", "NORTH", "SOUTH"] as Zone[]).map((item) => <button key={item} className={zone === item ? "is-active" : ""} onClick={() => setZone(item)}>{item}</button>)}</div></div>
        <div className="control-group"><span className="control-label">OPTIMIZATION</span><div className="control-segment">{(["QSWARM", "PSO", "GA", "ACO"] as Algorithm[]).map((item) => <button key={item} className={algorithm === item ? "is-active" : ""} onClick={() => setAlgorithm(item)}>{item}</button>)}</div></div>
      </div>
      <div className="simulation-route-picker"><div><span className="control-label">OSM ROUTE LAYERS</span><small>SELECT A REAL RAIPUR ROAD TRACE</small></div><div className="route-picker__options">{routeOptions.map((label, index) => <button key={`${label}-${index}`} className={selectedRoute === index ? "is-active" : ""} onClick={() => setSelectedRoute(index)}>{String(index + 1).padStart(2, "0")} / {label}</button>)}</div></div>
      <div className="simulation-footnote"><span>INTERACTIVE DEMO / SIMULATED TRAFFIC ENVIRONMENT</span><span>{incident ? "AFFECTED ZONE ONLY / WARM START ~8S" : "OSM / SUMO-INSPIRED NETWORK MODEL"}</span></div>
    </div>
  );
}
