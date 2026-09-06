// QSwarm visual system reminder: keep integration boundaries explicit. These async functions are demo adapters, not claims of a live QPSO backend.

import { benchmarkData, vehicles, zones } from "@/data/demo";

const pause = (ms: number) => new Promise((resolve) => window.setTimeout(resolve, ms));

export async function getFleetState() {
  await pause(120);
  return { vehicles, vehicleCount: 55, trucks: 40, buses: 15, mode: "DEMO / SIMULATION" as const };
}

export async function getTrafficState() {
  await pause(120);
  return { zones, status: "OPTIMIZING" as const, mode: "DEMO / SIMULATION" as const };
}

export async function runOptimization() {
  await pause(680);
  return { status: "completed" as const, affectedZone: "EAST" as const, warmStartSeconds: 8, coldStartSeconds: 90 };
}

export async function simulateIncident() {
  await pause(280);
  return { zone: "EAST" as const, road: "RING ROAD EAST", speedDelta: "−40%", status: "incident" as const };
}

export async function getBenchmarkResults() {
  await pause(120);
  return benchmarkData;
}
