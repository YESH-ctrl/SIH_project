// QSwarm visual system reminder: demo data is telemetry, not decoration. Keep labels precise, distinguish DEMO / SIMULATION, and preserve semantic traffic colors.

export type Zone = "ALL" | "EAST" | "WEST" | "NORTH" | "SOUTH";
export type Algorithm = "QSWARM" | "PSO" | "GA" | "ACO";

export type Vehicle = {
  id: string;
  type: "truck" | "bus";
  x: number;
  y: number;
  route: number;
  zone: Exclude<Zone, "ALL">;
};

export const zones: Array<{ id: Exclude<Zone, "ALL">; label: string; x: number; y: number; width: number; height: number }> = [
  { id: "NORTH", label: "NORTH", x: 10, y: 8, width: 35, height: 30 },
  { id: "WEST", label: "WEST", x: 8, y: 37, width: 30, height: 40 },
  { id: "EAST", label: "EAST", x: 64, y: 16, width: 28, height: 38 },
  { id: "SOUTH", label: "SOUTH", x: 42, y: 58, width: 44, height: 28 },
];

export const vehicles: Vehicle[] = [
  { id: "TRK-01", type: "truck", x: 17, y: 23, route: 1, zone: "NORTH" },
  { id: "TRK-02", type: "truck", x: 25, y: 30, route: 1, zone: "NORTH" },
  { id: "TRK-03", type: "truck", x: 32, y: 19, route: 2, zone: "NORTH" },
  { id: "TRK-04", type: "truck", x: 43, y: 26, route: 2, zone: "NORTH" },
  { id: "TRK-05", type: "truck", x: 54, y: 34, route: 3, zone: "EAST" },
  { id: "TRK-06", type: "truck", x: 63, y: 42, route: 3, zone: "EAST" },
  { id: "TRK-07", type: "truck", x: 72, y: 31, route: 4, zone: "EAST" },
  { id: "TRK-08", type: "truck", x: 79, y: 45, route: 4, zone: "EAST" },
  { id: "TRK-09", type: "truck", x: 21, y: 54, route: 5, zone: "WEST" },
  { id: "TRK-10", type: "truck", x: 33, y: 48, route: 5, zone: "WEST" },
  { id: "TRK-11", type: "truck", x: 39, y: 60, route: 6, zone: "SOUTH" },
  { id: "TRK-12", type: "truck", x: 48, y: 69, route: 6, zone: "SOUTH" },
  { id: "TRK-13", type: "truck", x: 58, y: 75, route: 7, zone: "SOUTH" },
  { id: "TRK-14", type: "truck", x: 69, y: 66, route: 7, zone: "SOUTH" },
  { id: "TRK-15", type: "truck", x: 77, y: 78, route: 8, zone: "SOUTH" },
  { id: "TRK-16", type: "truck", x: 26, y: 41, route: 9, zone: "WEST" },
  { id: "TRK-17", type: "truck", x: 45, y: 17, route: 10, zone: "NORTH" },
  { id: "TRK-18", type: "truck", x: 57, y: 25, route: 11, zone: "EAST" },
  { id: "TRK-19", type: "truck", x: 70, y: 57, route: 12, zone: "SOUTH" },
  { id: "TRK-20", type: "truck", x: 17, y: 72, route: 13, zone: "WEST" },
  { id: "BUS-01", type: "bus", x: 13, y: 33, route: 14, zone: "NORTH" },
  { id: "BUS-02", type: "bus", x: 31, y: 37, route: 15, zone: "WEST" },
  { id: "BUS-03", type: "bus", x: 48, y: 42, route: 16, zone: "EAST" },
  { id: "BUS-04", type: "bus", x: 58, y: 51, route: 17, zone: "EAST" },
  { id: "BUS-05", type: "bus", x: 73, y: 62, route: 18, zone: "SOUTH" },
  { id: "BUS-06", type: "bus", x: 36, y: 75, route: 19, zone: "SOUTH" },
];

export const routePaths = [
  "M 8 73 C 24 63, 24 40, 40 39 S 65 27, 91 12",
  "M 11 20 C 28 21, 31 36, 44 38 S 68 52, 86 77",
  "M 7 45 C 20 45, 24 28, 39 27 S 65 39, 93 41",
  "M 18 87 C 31 77, 34 56, 51 53 S 72 55, 88 26",
  "M 19 8 C 32 19, 44 28, 48 45 S 58 72, 80 86",
];

export const architectureStages = [
  { id: "ingest", number: "01", label: "DATA INGESTION", short: "Road graph + fleet signal", description: "Collect OpenStreetMap road graph, live or simulated GPS, historical congestion, and the fleet manifest.", input: "OSM / GPS / history", output: "Weighted road graph" },
  { id: "zones", number: "02", label: "ZONE DECOMPOSITION", short: "Overlapping graph clusters", description: "Split the city into overlapping network zones so local swarms can optimize in parallel without losing boundary context.", input: "Weighted road graph", output: "Overlapping zones" },
  { id: "swarms", number: "03", label: "ZONE SWARMS", short: "Discrete QPSO in each zone", description: "Run discrete, warm-started Quantum-behaved Particle Swarm Optimization inside every zone.", input: "Zone constraints", output: "Candidate routes" },
  { id: "exchange", number: "04", label: "ELITE EXCHANGE", short: "Boundary negotiation", description: "Exchange elite particles at shared boundaries so local improvements remain system-aware.", input: "Elite particles", output: "Negotiated routes" },
  { id: "objective", number: "05", label: "SYSTEM OBJECTIVE", short: "Travel time + congestion + cost", description: "Evaluate total travel time, congestion, and operating cost while maintaining fairness and heavy-vehicle constraints.", input: "Fleet assignment", output: "System fitness" },
  { id: "event", number: "06", label: "EVENT MONITOR", short: "Re-optimize affected zones", description: "Detect congestion threshold breaches and warm-start only the zones touched by the disruption.", input: "Traffic event", output: "Local re-route" },
  { id: "dispatch", number: "07", label: "DISPATCH", short: "Move the city", description: "Release the system-optimal fleet assignment to dispatch, with the previous solution kept available for warm starts.", input: "Feasible routes", output: "Fleet dispatch" },
];

export const timeline = [
  { time: "07:00", label: "INGEST", detail: "Road graph, simulated GPS, and fleet manifest enter the system.", phase: "signal" },
  { time: "07:05", label: "SWARM INITIALIZATION", detail: "55 vehicles are seeded from a previous feasible solution.", phase: "signal" },
  { time: "07:06–07:20", label: "LOCAL OPTIMIZATION", detail: "Zone swarms search discrete routes and repair local conflicts.", phase: "search" },
  { time: "07:20", label: "BOUNDARY NEGOTIATION", detail: "Elite particles cross shared zone boundaries.", phase: "exchange" },
  { time: "07:30", label: "DISPATCH", detail: "Fleet assignment is released to the simulated city.", phase: "dispatch" },
  { time: "08:47", label: "ACCIDENT DETECTED", detail: "Ring Road East reports a simulated 40% speed drop.", phase: "incident" },
  { time: "08:47+", label: "WARM-START RE-OPTIMIZATION", detail: "Only the affected zone re-routes in the demo state.", phase: "reopt" },
  { time: "09:00–10:00", label: "CONTINUOUS OPERATION", detail: "Unaffected zones continue normally while the system monitors thresholds.", phase: "steady" },
];

export const benchmarkData = {
  QUALITY: { QSWARM: 82, PSO: 71, GA: 68, ACO: 74 },
  TIME: { QSWARM: 76, PSO: 61, GA: 47, ACO: 53 },
  LATENCY: { QSWARM: 88, PSO: 64, GA: 42, ACO: 57 },
} as const;

export const benchmarkFootnote = "DEMO / PLACEHOLDER DATA — replace with measured experiment results before publication.";
