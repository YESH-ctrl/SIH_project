// QSwarm style reminder: benchmark graphics must be honest. Keep the data source label visible and avoid winner-takes-all dashboard rhetoric.

import { useState } from "react";
import { benchmarkData, benchmarkFootnote } from "@/data/demo";

type BenchmarkMetric = keyof typeof benchmarkData;
const metrics: Array<{ id: BenchmarkMetric; label: string; unit: string }> = [
  { id: "QUALITY", label: "SOLUTION QUALITY", unit: "relative score" },
  { id: "TIME", label: "CONVERGENCE SPEED", unit: "relative index" },
  { id: "LATENCY", label: "OPTIMIZATION LATENCY", unit: "relative index" },
];
const algorithms = ["QSWARM", "PSO", "GA", "ACO"] as const;

export function BenchmarkPanel() {
  const [metric, setMetric] = useState<BenchmarkMetric>("QUALITY");
  const values = benchmarkData[metric];

  return (
    <div className="benchmark-panel">
      <div className="benchmark-head"><div><span className="micro-label">COMPARATIVE VIEW / DEMO DATA</span><h3>Transparent by design.</h3></div><div className="benchmark-tabs" role="tablist" aria-label="Benchmark metric"><span className="micro-label">VIEW</span>{metrics.map((item) => <button key={item.id} className={metric === item.id ? "is-active" : ""} onClick={() => setMetric(item.id)} role="tab" aria-selected={metric === item.id}>{item.id}</button>)}</div></div>
      <div className="benchmark-chart">
        <div className="benchmark-chart__axis"><span>100</span><span>75</span><span>50</span><span>25</span><span>0</span></div>
        <div className="benchmark-bars">{algorithms.map((algorithm) => <div className={`benchmark-bar ${algorithm === "QSWARM" ? "is-qswarm" : ""}`} key={algorithm}><div className="benchmark-bar__track"><div className="benchmark-bar__fill" style={{ height: `${values[algorithm]}%` }}><span>{values[algorithm]}</span></div></div><strong>{algorithm}</strong></div>)}</div>
      </div>
      <div className="benchmark-foot"><span>{metrics.find((item) => item.id === metric)?.label} / {metrics.find((item) => item.id === metric)?.unit}</span><span>{benchmarkFootnote}</span></div>
    </div>
  );
}
