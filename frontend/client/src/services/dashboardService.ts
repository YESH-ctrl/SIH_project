// Q-FLOW Role-Specific Dashboard Data Service Abstraction Layer

export interface AdminDashboardData {
  organizationName: string;
  totalVehicles: number;
  activeVehicles: number;
  totalDeliveryPoints: number;
  activeRoutes: number;
  avgUtilization: number;
  networkCongestion: number;
  completedDeliveriesToday: number;
  systemHealthPercent: number;
  roleDistribution: Array<{ role: string; count: number; color: string }>;
  fleetHealth: { active: number; idle: number; maintenance: number };
  operationsSummary: { completed: number; inProgress: number; delayed: number; exceptions: number; avgTimeMin: number };
  networkHealth: { congestionPercent: number; avgSpeedKmh: number; majorEventsCount: number; affectedZones: string[]; optimizationStatus: string };
  usersOverview: { total: number; opsManagers: number; dispatchers: number; analysts: number; recentUsers: Array<{ name: string; email: string; role: string; date: string }> };
  recentActivity: Array<{ id: string; time: string; type: string; title: string; desc: string }>;
}

export interface OperationsDashboardData {
  activeVehicles: number;
  activeRoutes: number;
  deliveryStops: number;
  networkCongestion: number;
  avgSpeedKmh: number;
  onTimeDeliveryPercent: number;
  delayedRoutesCount: number;
  optimizationStatus: string;
  operationalHealth: { onSchedule: number; delayed: number; idle: number; atRisk: number; exceptions: number };
  latestIncident: { code: string; location: string; delayIncreasePercent: number; affectedVehicles: number; affectedRoutes: number; severity: string };
  currentOptimization: { runId: string; algorithm: string; vehicleCount: number; stopCount: number; progressPercent: number; bestFitness: number; status: string; lastRunTime: string };
  priorityActions: Array<{ id: string; title: string; urgency: "HIGH" | "MEDIUM" | "CRITICAL"; count: number; actionLabel: string; targetTab: string }>;
}

export interface DispatcherDashboardData {
  vehiclesOnline: number;
  vehiclesMoving: number;
  vehiclesIdle: number;
  activeRoutes: number;
  delayedRoutes: number;
  criticalIncidentsCount: number;
  criticalIncidents: Array<{ id: string; code: string; location: string; delayText: string; vehiclesAffected: number; severity: "CRITICAL" | "HIGH" }>;
  activeRoutesList: Array<{ id: string; routeCode: string; vehicleCode: string; driver: string; nextStop: string; eta: string; delayMin: number; status: "ON_TIME" | "DELAYED" | "REROUTED" }>;
  deliveryExceptions: Array<{ id: string; type: string; details: string; status: string; time: string }>;
  realtimeActivityFeed: Array<{ id: string; time: string; text: string; category: "VEHICLE" | "INCIDENT" | "ROUTE" | "DISPATCH" }>;
}

export interface AnalystDashboardData {
  avgTravelTimeMin: number;
  avgRouteDistanceKm: number;
  onTimeDeliveryPercent: number;
  avgNetworkCongestionPercent: number;
  fleetUtilizationPercent: number;
  optimizationImprovementPercent: number;
  avgOptimizationTimeSec: number;
  reoptimizationCount: number;
  algorithmBenchmarks: Array<{ algorithm: string; bestFitness: number; avgFitness: number; travelTimeSavedPercent: number; avgDistanceKm: number; avgRuntimeSec: number; convergenceRate: string }>;
  qpsoAnalytics: { convergenceCurve: Array<{ iteration: number; qpso: number; ga: number; pso: number }>; bestFitness: number; populationSize: number; iterations: number; runtimeSec: number };
  trafficAnalytics: { congestionByZone: Array<{ zone: string; congestion: number }>; peakDelayWindows: string[]; mostAffectedEdges: string[] };
  optimizationHistory: Array<{ runId: string; date: string; algorithm: string; vehicles: number; stops: number; fitness: number; runtimeSec: number; status: string }>;
}

// -----------------------------------------------------------------------------
// Provider Functions (Initially returning realistic demonstration data)
// -----------------------------------------------------------------------------

export function getAdminDashboardData(): AdminDashboardData {
  return {
    organizationName: "SIH 2026 Fleet Operations",
    totalVehicles: 40,
    activeVehicles: 32,
    totalDeliveryPoints: 300,
    activeRoutes: 28,
    avgUtilization: 84.2,
    networkCongestion: 38,
    completedDeliveriesToday: 248,
    systemHealthPercent: 99.8,
    roleDistribution: [
      { role: "Operations Managers", count: 1, color: "#38bdf8" },
      { role: "Dispatchers", count: 2, color: "#a855f7" },
      { role: "Analysts", count: 1, color: "#f59e0b" },
      { role: "Org Admins", count: 1, color: "#10b981" },
    ],
    fleetHealth: { active: 32, idle: 5, maintenance: 3 },
    operationsSummary: { completed: 248, inProgress: 28, delayed: 4, exceptions: 2, avgTimeMin: 34.5 },
    networkHealth: {
      congestionPercent: 38,
      avgSpeedKmh: 32,
      majorEventsCount: 1,
      affectedZones: ["Zone 3 Express", "Rajpur Central Corridor"],
      optimizationStatus: "OPTIMIZED",
    },
    usersOverview: {
      total: 5,
      opsManagers: 1,
      dispatchers: 2,
      analysts: 1,
      recentUsers: [
        { name: "Dasari Yeswanth", email: "yeswanthdasari1412@gmail.com", role: "ORG_ADMIN", date: "2026-09-05" },
        { name: "Anwesha", email: "anwesha@gmail.com", role: "DISPATCHER", date: "2026-09-05" },
        { name: "kruthi", email: "kruthi@gmail.com", role: "OPERATIONS_MANAGER", date: "2026-09-05" },
        { name: "Nikhil", email: "nikhil@gmail.com", role: "DISPATCHER", date: "2026-09-05" },
        { name: "Bhuvana", email: "bhuvana@gmail.com", role: "ANALYST", date: "2026-09-05" },
      ],
    },
    recentActivity: [
      { id: "act_1", time: "08:40 AM", type: "OPTIMIZATION", title: "QPSO Fleet Optimization Completed", desc: "Saved 18.4% travel time across 40 vehicles" },
      { id: "act_2", time: "08:25 AM", type: "INCIDENT", title: "Traffic Event Detected on E17", desc: "Accident reported on Express E17 (+78% delay)" },
      { id: "act_3", time: "08:10 AM", type: "USER", title: "User Account Provisioned", desc: "Sienna Miller assigned DISPATCHER role" },
      { id: "act_4", time: "07:45 AM", type: "FLEET", title: "Vehicle V-038 Added to Active Fleet", desc: "Capacity: 1200kg • Depot: Central Depot" },
    ],
  };
}

export function getOperationsDashboardData(): OperationsDashboardData {
  return {
    activeVehicles: 40,
    activeRoutes: 40,
    deliveryStops: 300,
    networkCongestion: 38,
    avgSpeedKmh: 32,
    onTimeDeliveryPercent: 94.2,
    delayedRoutesCount: 4,
    optimizationStatus: "OPTIMIZATION READY",
    operationalHealth: { onSchedule: 34, delayed: 4, idle: 2, atRisk: 3, exceptions: 1 },
    latestIncident: {
      code: "E17",
      location: "Rajpur Express E17",
      delayIncreasePercent: 78,
      affectedVehicles: 6,
      affectedRoutes: 4,
      severity: "High",
    },
    currentOptimization: {
      runId: "QPSO-RUN-8942",
      algorithm: "QPSO (Quantum Swarm)",
      vehicleCount: 40,
      stopCount: 300,
      progressPercent: 100,
      bestFitness: 1240.8,
      status: "COMPLETED",
      lastRunTime: "08:40 AM",
    },
    priorityActions: [
      { id: "pa_1", title: "6 Vehicles Affected by E17 Incident", urgency: "HIGH", count: 6, actionLabel: "Trigger Reoptimization", targetTab: "reoptimization" },
      { id: "pa_2", title: "4 Routes Delayed > 15 Minutes", urgency: "MEDIUM", count: 4, actionLabel: "Review Delayed Routes", targetTab: "route-monitor" },
      { id: "pa_3", title: "Congestion Spike in Zone 3 Corridor", urgency: "HIGH", count: 1, actionLabel: "Inspect Network Map", targetTab: "network-map" },
    ],
  };
}

export function getDispatcherDashboardData(): DispatcherDashboardData {
  return {
    vehiclesOnline: 40,
    vehiclesMoving: 36,
    vehiclesIdle: 4,
    activeRoutes: 40,
    delayedRoutes: 4,
    criticalIncidentsCount: 1,
    criticalIncidents: [
      {
        id: "inc_01",
        code: "E17",
        location: "Express E17 (KM 14.2)",
        delayText: "+78% Delay",
        vehiclesAffected: 6,
        severity: "CRITICAL",
      },
    ],
    activeRoutesList: [
      { id: "r_101", routeCode: "R-007", vehicleCode: "VH-007", driver: "Vikram Singh", nextStop: "Stop #14 (Civil Lines)", eta: "09:12 AM", delayMin: 18, status: "DELAYED" },
      { id: "r_102", routeCode: "R-012", vehicleCode: "VH-012", driver: "Amit Sharma", nextStop: "Stop #08 (Industrial Hub)", eta: "08:58 AM", delayMin: 0, status: "ON_TIME" },
      { id: "r_103", routeCode: "R-023", vehicleCode: "VH-023", driver: "Rahul Verma", nextStop: "Stop #21 (Tech Park)", eta: "09:05 AM", delayMin: 5, status: "REROUTED" },
      { id: "r_104", routeCode: "R-004", vehicleCode: "VH-004", driver: "Priya Patel", nextStop: "Stop #03 (North Depot)", eta: "08:50 AM", delayMin: 0, status: "ON_TIME" },
    ],
    deliveryExceptions: [
      { id: "ex_1", type: "Road Blocked", details: "E17 Construction Hazard at Junction 4", status: "Active", time: "08:35 AM" },
      { id: "ex_2", type: "Customer Delay", details: "Recipient requested 10-min window shift", status: "Resolved", time: "08:20 AM" },
    ],
    realtimeActivityFeed: [
      { id: "f_1", time: "08:44:12", text: "Vehicle VH-023 successfully completed rerouting around E17 hazard", category: "VEHICLE" },
      { id: "f_2", time: "08:42:05", text: "Dispatch Reoptimization trigger initiated by Operator", category: "DISPATCH" },
      { id: "f_3", time: "08:38:50", text: "Traffic sensor alert: Express E17 congestion exceeds 85%", category: "INCIDENT" },
      { id: "f_4", time: "08:35:10", text: "Route R-007 flagged for 18-minute delay projection", category: "ROUTE" },
    ],
  };
}

export function getAnalystDashboardData(): AnalystDashboardData {
  return {
    avgTravelTimeMin: 34.2,
    avgRouteDistanceKm: 18.6,
    onTimeDeliveryPercent: 94.2,
    avgNetworkCongestionPercent: 38,
    fleetUtilizationPercent: 84.2,
    optimizationImprovementPercent: 18.4,
    avgOptimizationTimeSec: 2.1,
    reoptimizationCount: 14,
    algorithmBenchmarks: [
      { algorithm: "QPSO (Quantum Swarm)", bestFitness: 1240.8, avgFitness: 1255.4, travelTimeSavedPercent: 18.4, avgDistanceKm: 18.6, avgRuntimeSec: 2.1, convergenceRate: "Rapid (Iter 35)" },
      { algorithm: "Standard PSO", bestFitness: 1420.1, avgFitness: 1460.8, travelTimeSavedPercent: 12.1, avgDistanceKm: 21.2, avgRuntimeSec: 6.4, convergenceRate: "Moderate (Iter 85)" },
      { algorithm: "Genetic Algorithm (GA)", bestFitness: 1390.5, avgFitness: 1435.2, travelTimeSavedPercent: 13.5, avgDistanceKm: 20.4, avgRuntimeSec: 12.8, convergenceRate: "Slow (Iter 140)" },
      { algorithm: "Ant Colony (ACO)", bestFitness: 1480.0, avgFitness: 1510.3, travelTimeSavedPercent: 9.8, avgDistanceKm: 22.5, avgRuntimeSec: 18.2, convergenceRate: "Slow (Iter 180)" },
    ],
    qpsoAnalytics: {
      convergenceCurve: [
        { iteration: 0, qpso: 2400, ga: 2400, pso: 2400 },
        { iteration: 10, qpso: 1850, ga: 2100, pso: 2050 },
        { iteration: 20, qpso: 1450, ga: 1800, pso: 1720 },
        { iteration: 30, qpso: 1280, ga: 1600, pso: 1550 },
        { iteration: 40, qpso: 1245, ga: 1480, pso: 1460 },
        { iteration: 50, qpso: 1240.8, ga: 1410, pso: 1430 },
      ],
      bestFitness: 1240.8,
      populationSize: 50,
      iterations: 50,
      runtimeSec: 2.1,
    },
    trafficAnalytics: {
      congestionByZone: [
        { zone: "Zone 1 (North)", congestion: 24 },
        { zone: "Zone 2 (Central)", congestion: 48 },
        { zone: "Zone 3 (Express E17)", congestion: 82 },
        { zone: "Zone 4 (Industrial)", congestion: 35 },
      ],
      peakDelayWindows: ["08:00 - 09:30 AM", "05:00 - 06:30 PM"],
      mostAffectedEdges: ["Expressway E17 Segment 4", "Central Link Arterial", "Ring Road East"],
    },
    optimizationHistory: [
      { runId: "QPSO-RUN-8942", date: "Today, 08:40 AM", algorithm: "QPSO", vehicles: 40, stops: 300, fitness: 1240.8, runtimeSec: 2.1, status: "Completed" },
      { runId: "QPSO-RUN-8941", date: "Today, 07:30 AM", algorithm: "QPSO", vehicles: 40, stops: 300, fitness: 1265.4, runtimeSec: 2.3, status: "Completed" },
      { runId: "GA-BENCH-102", date: "Yesterday, 18:00 PM", algorithm: "Genetic Algorithm", vehicles: 40, stops: 300, fitness: 1390.5, runtimeSec: 12.8, status: "Completed" },
    ],
  };
}
