import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";
import {
  demoApi,
  networkApi,
  optimizationApi,
  DemoScenarioResponse,
  NetworkNodeDTO,
  NetworkEdgeDTO,
  NetworkStatsResponse,
  ShortestPathRouteResponse,
  OptimizationRunResponse,
  VehicleRouteResult,
  IncidentSimulationResponse,
  RerouteResponse,
} from "@/services/apiClient";

export type DemoStepId = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8;

export interface StepInfo {
  id: DemoStepId;
  key: string;
  title: string;
  subtitle: string;
  shortLabel: string;
}

export const DEMO_STEPS: StepInfo[] = [
  { id: 1, key: "STEP_1_NETWORK", title: "NETWORK", subtitle: "Build the transportation model before making routing decisions.", shortLabel: "1 NETWORK" },
  { id: 2, key: "STEP_2_ROUTING", title: "ROUTING", subtitle: "Demonstrate valid point-to-point Dijkstra routing along graph geometry.", shortLabel: "2 ROUTING" },
  { id: 3, key: "STEP_3_FLEET_DEMAND", title: "FLEET & DEMAND", subtitle: "Initialize central depot, multi-vehicle fleet, and delivery stops.", shortLabel: "3 FLEET" },
  { id: 4, key: "STEP_4_BASELINE", title: "BASELINE PLAN", subtitle: "Establish measurable baseline fleet routes prior to optimization.", shortLabel: "4 BASELINE" },
  { id: 5, key: "STEP_5_QPSO", title: "QPSO OPTIMIZATION", subtitle: "Execute quantum-inspired particle swarm algorithm on classical compute.", shortLabel: "5 QPSO" },
  { id: 6, key: "STEP_6_OPTIMIZED_FLEET", title: "OPTIMIZED FLEET", subtitle: "Compare QPSO optimized fleet routes against baseline metrics.", shortLabel: "6 OPTIMIZED" },
  { id: 7, key: "STEP_7_INCIDENT", title: "TRAFFIC INCIDENT", subtitle: "Simulate a live road blockage impacting active vehicle routes.", shortLabel: "7 INCIDENT" },
  { id: 8, key: "STEP_8_REROUTING", title: "DYNAMIC RE-ROUTING", subtitle: "Q-FLOW generates dynamic detours and dispatches updated routes.", shortLabel: "8 RE-ROUTING" },
];

export interface DeliveryCoverageValidation {
  totalDeliveries: number;
  coveredDeliveries: number;
  unassignedDeliveries: number;
  duplicateDeliveries: number;
  coverageComplete: boolean;
  capacityFeasible: boolean;
  routeFeasible: boolean;
  valid: boolean;
  unassignedIds: string[];
  duplicateIds: string[];
  errors: string[];
}

export function validateDeliveryCoverage(
  routes: VehicleRouteResult[],
  deliveryPoints: { id: string; demand?: number; demand_kg?: number }[],
  vehicles: { id: string; capacity?: number; capacity_kg?: number }[]
): DeliveryCoverageValidation {
  const totalDeliveries = deliveryPoints.length;
  const allDpIds = new Set(deliveryPoints.map((dp) => dp.id));
  const seenDpIds = new Map<string, number>();

  let capacityFeasible = true;
  const errors: string[] = [];

  routes.forEach((r) => {
    const veh = vehicles.find((v) => v.id === r.vehicle_id);
    const maxCap = veh ? (veh.capacity_kg || veh.capacity || 50) : (r.capacity || 50);
    const assignedLoad = r.total_demand || r.stops.reduce((sum, s) => sum + s.demand, 0);

    if (assignedLoad > maxCap) {
      capacityFeasible = false;
      errors.push(`Vehicle ${r.vehicle_name || r.vehicle_id} assigned load (${assignedLoad}u) exceeds capacity (${maxCap}u).`);
    }

    r.stops.forEach((s) => {
      const dpId = s.delivery_point_id || s.node_id;
      seenDpIds.set(dpId, (seenDpIds.get(dpId) || 0) + 1);
    });
  });

  const coveredDeliveries = seenDpIds.size;
  const unassignedIds: string[] = [];
  const duplicateIds: string[] = [];

  allDpIds.forEach((id) => {
    const count = seenDpIds.get(id) || 0;
    if (count === 0) unassignedIds.push(id);
    if (count > 1) duplicateIds.push(id);
  });

  const unassignedDeliveries = unassignedIds.length;
  const duplicateDeliveries = duplicateIds.length;
  const coverageComplete = coveredDeliveries === totalDeliveries && unassignedDeliveries === 0;

  if (unassignedDeliveries > 0) {
    errors.push(`${unassignedDeliveries} delivery points are unassigned.`);
  }
  if (duplicateDeliveries > 0) {
    errors.push(`${duplicateDeliveries} delivery points are assigned to multiple routes.`);
  }

  const valid = coverageComplete && capacityFeasible && errors.length === 0;

  return {
    totalDeliveries,
    coveredDeliveries,
    unassignedDeliveries,
    duplicateDeliveries,
    coverageComplete,
    capacityFeasible,
    routeFeasible: true,
    valid,
    unassignedIds,
    duplicateIds,
    errors,
  };
}

interface JuryDemoContextType {
  // Scenario Data from Database
  scenario: DemoScenarioResponse | null;
  isLoadingScenario: boolean;
  scenarioError: string | null;

  // Step 1: Network Graph Data
  nodes: NetworkNodeDTO[];
  edges: NetworkEdgeDTO[];
  stats: NetworkStatsResponse | null;
  isLoadingNetwork: boolean;

  // Step 2: Point-to-Point Route Data
  abRoute: ShortestPathRouteResponse | null;
  calculateAbRoute: (sourceLat: number, sourceLng: number, targetLat: number, targetLng: number) => Promise<void>;
  isCalculatingAbRoute: boolean;
  abRouteError: string | null;

  // Step 4 & 6: Baseline & QPSO Optimization Data
  baselineRoutes: VehicleRouteResult[];
  qpsoResult: OptimizationRunResponse | null;
  qpsoRoutes: VehicleRouteResult[];
  runQpsoOptimization: () => Promise<void>;
  isOptimizing: boolean;
  optError: string | null;
  baselineCoverage: DeliveryCoverageValidation | null;
  qpsoCoverage: DeliveryCoverageValidation | null;

  // Step 7: Incident Simulation Data
  incident: IncidentSimulationResponse | null;
  triggerIncident: () => Promise<void>;
  isSimulatingIncident: boolean;

  // Step 8: Rerouting Data
  rerouteResult: RerouteResponse | null;
  executeRerouting: () => Promise<void>;
  isRerouting: boolean;
  activeVrpRoutes: VehicleRouteResult[];

  // State Machine & Navigation
  currentStep: DemoStepId;
  completedSteps: Set<DemoStepId>;
  goToStep: (step: DemoStepId) => void;
  nextStep: () => void;
  prevStep: () => void;
  restartDemo: () => void;
  canAdvance: boolean;
}

const JuryDemoContext = createContext<JuryDemoContextType | undefined>(undefined);

export function JuryDemoProvider({ children }: { children: ReactNode }) {
  // State Machine
  const [currentStep, setCurrentStep] = useState<DemoStepId>(1);
  const [completedSteps, setCompletedSteps] = useState<Set<DemoStepId>>(new Set<DemoStepId>([1]));

  // Scenario
  const [scenario, setScenario] = useState<DemoScenarioResponse | null>(null);
  const [isLoadingScenario, setIsLoadingScenario] = useState<boolean>(true);
  const [scenarioError, setScenarioError] = useState<string | null>(null);

  // Network
  const networkId = "9cb256c8-6c5a-4f05-8259-e8b887334fa2";
  const [nodes, setNodes] = useState<NetworkNodeDTO[]>([]);
  const [edges, setEdges] = useState<NetworkEdgeDTO[]>([]);
  const [stats, setStats] = useState<NetworkStatsResponse | null>(null);
  const [isLoadingNetwork, setIsLoadingNetwork] = useState<boolean>(true);

  // Routing (Step 2)
  const [abRoute, setAbRoute] = useState<ShortestPathRouteResponse | null>(null);
  const [isCalculatingAbRoute, setIsCalculatingAbRoute] = useState<boolean>(false);
  const [abRouteError, setAbRouteError] = useState<string | null>(null);

  // Optimization (Steps 4, 5, 6)
  const [baselineRoutes, setBaselineRoutes] = useState<VehicleRouteResult[]>([]);
  const [qpsoResult, setQpsoResult] = useState<OptimizationRunResponse | null>(null);
  const [qpsoRoutes, setQpsoRoutes] = useState<VehicleRouteResult[]>([]);
  const [isOptimizing, setIsOptimizing] = useState<boolean>(false);
  const [optError, setOptError] = useState<string | null>(null);

  const [baselineCoverage, setBaselineCoverage] = useState<DeliveryCoverageValidation | null>(null);
  const [qpsoCoverage, setQpsoCoverage] = useState<DeliveryCoverageValidation | null>(null);

  // Incident (Step 7)
  const [incident, setIncident] = useState<IncidentSimulationResponse | null>(null);
  const [isSimulatingIncident, setIsSimulatingIncident] = useState<boolean>(false);

  // Rerouting (Step 8)
  const [rerouteResult, setRerouteResult] = useState<RerouteResponse | null>(null);
  const [isRerouting, setIsRerouting] = useState<boolean>(false);
  const [activeVrpRoutes, setActiveVrpRoutes] = useState<VehicleRouteResult[]>([]);

  // 1. Initial Scenario Load & Baseline Solver Initialization
  useEffect(() => {
    async function loadScenario() {
      setIsLoadingScenario(true);
      try {
        const sc = await demoApi.getScenario();
        setScenario(sc);
        setIsLoadingScenario(false);

        // Fetch baseline & initial VRP solver dataset
        const initOpt = await optimizationApi.runDemo(20, 10, 42).catch(() => null);
        if (initOpt && initOpt.baseline_routes) {
          setBaselineRoutes(initOpt.baseline_routes);
          setActiveVrpRoutes(initOpt.baseline_routes);
          const cov = validateDeliveryCoverage(
            initOpt.baseline_routes,
            sc.delivery_points || initOpt.delivery_points || [],
            sc.vehicles || []
          );
          setBaselineCoverage(cov);
        }
      } catch (err: any) {
        console.error("Failed to load scenario:", err);
        setScenarioError("Unable to connect to Q-FLOW database scenario.");
        setIsLoadingScenario(false);
      }
    }

    async function loadNetworkGraph() {
      setIsLoadingNetwork(true);
      try {
        const [nodesData, edgesData, statsData] = await Promise.all([
          networkApi.getNetworkNodes(networkId, 1, 5000),
          networkApi.getNetworkEdges(networkId, 1, 5000),
          networkApi.getNetworkStats(networkId).catch(() => null),
        ]);
        setNodes(nodesData || []);
        setEdges(edgesData || []);
        setStats(statsData);
        setIsLoadingNetwork(false);
      } catch (err) {
        console.warn("Error loading network graph:", err);
        setIsLoadingNetwork(false);
      }
    }

    loadScenario();
    loadNetworkGraph();
  }, []);

  // Calculate Point-to-Point Route (Step 2)
  const calculateAbRoute = async (sourceLat: number, sourceLng: number, targetLat: number, targetLng: number) => {
    setIsCalculatingAbRoute(true);
    setAbRouteError(null);
    try {
      const res = await networkApi.calculateRoute(networkId, {
        source_lat: sourceLat,
        source_lng: sourceLng,
        target_lat: targetLat,
        target_lng: targetLng,
      });
      setAbRoute(res);
      setCompletedSteps((prev) => new Set<DemoStepId>([...Array.from(prev), 2]));
      setIsCalculatingAbRoute(false);
    } catch (err: any) {
      setAbRouteError("Route calculation failed. Please try another pair of nodes.");
      setIsCalculatingAbRoute(false);
    }
  };

  // Run QPSO Engine (Step 5)
  const runQpsoOptimization = async () => {
    setIsOptimizing(true);
    setOptError(null);
    try {
      const res = await optimizationApi.runDemo(30, 100, 42);
      setQpsoResult(res);

      const dps = scenario?.delivery_points || res.delivery_points || [];
      const vehs = scenario?.vehicles || [];

      if (res.baseline_routes) {
        setBaselineRoutes(res.baseline_routes);
        setBaselineCoverage(validateDeliveryCoverage(res.baseline_routes, dps, vehs));
      }
      if (res.qpso_routes) {
        setQpsoRoutes(res.qpso_routes);
        setActiveVrpRoutes(res.qpso_routes);
        setQpsoCoverage(validateDeliveryCoverage(res.qpso_routes, dps, vehs));
      }
      setCompletedSteps((prev) => new Set<DemoStepId>([...Array.from(prev), 4, 5, 6]));
      setIsOptimizing(false);
    } catch (err: any) {
      setOptError("Optimization run failed: " + (err.message || "Unknown error"));
      setIsOptimizing(false);
    }
  };

  // Trigger Incident Simulation (Step 7)
  const triggerIncident = async () => {
    setIsSimulatingIncident(true);
    try {
      const res = await optimizationApi.simulateIncident(networkId, "veh_01");
      setIncident(res);
      setCompletedSteps((prev) => new Set<DemoStepId>([...Array.from(prev), 7]));
      setIsSimulatingIncident(false);
    } catch (err: any) {
      console.warn("Incident simulation error:", err);
      setIsSimulatingIncident(false);
    }
  };

  // Execute Dynamic Rerouting (Step 8)
  const executeRerouting = async () => {
    if (!incident) return;
    setIsRerouting(true);
    try {
      const res = await optimizationApi.rerouteVehicle(
        networkId,
        incident.incident_id,
        incident.edge_id,
        incident.affected_vehicle_id || "veh_01"
      );
      setRerouteResult(res);

      if (res.rerouted_route && activeVrpRoutes.length > 0) {
        const updated = activeVrpRoutes.map((r) =>
          r.vehicle_id === res.affected_vehicle_id ? res.rerouted_route : r
        );
        setActiveVrpRoutes(updated);
      }
      setCompletedSteps((prev) => new Set<DemoStepId>([...Array.from(prev), 8]));
      setIsRerouting(false);
    } catch (err: any) {
      console.warn("Rerouting error:", err);
      setIsRerouting(false);
    }
  };

  // Navigation Logic & Step Completion Validation
  const canAdvance = React.useMemo(() => {
    switch (currentStep) {
      case 1:
        return !isLoadingNetwork;
      case 2:
        return abRoute !== null;
      case 3:
        return scenario !== null && scenario.vehicles.length > 0;
      case 4:
        return baselineRoutes.length > 0;
      case 5:
        return qpsoResult !== null;
      case 6:
        return qpsoResult !== null;
      case 7:
        return incident !== null;
      case 8:
        return rerouteResult !== null;
      default:
        return true;
    }
  }, [currentStep, isLoadingNetwork, abRoute, scenario, baselineRoutes, qpsoResult, incident, rerouteResult]);

  const goToStep = (step: DemoStepId) => {
    if (completedSteps.has(step) || step <= currentStep + 1) {
      setCurrentStep(step);
    }
  };

  const nextStep = () => {
    if (currentStep < 8) {
      const next = (currentStep + 1) as DemoStepId;
      setCompletedSteps((prev) => new Set<DemoStepId>([...Array.from(prev), currentStep]));
      setCurrentStep(next);
    }
  };

  const prevStep = () => {
    if (currentStep > 1) {
      setCurrentStep((currentStep - 1) as DemoStepId);
    }
  };

  const restartDemo = () => {
    setCurrentStep(1);
    setCompletedSteps(new Set<DemoStepId>([1]));
    setAbRoute(null);
    setQpsoResult(null);
    setQpsoRoutes([]);
    setIncident(null);
    setRerouteResult(null);
    if (baselineRoutes.length > 0) setActiveVrpRoutes(baselineRoutes);
  };

  return (
    <JuryDemoContext.Provider
      value={{
        scenario,
        isLoadingScenario,
        scenarioError,
        nodes,
        edges,
        stats,
        isLoadingNetwork,
        abRoute,
        calculateAbRoute,
        isCalculatingAbRoute,
        abRouteError,
        baselineRoutes,
        qpsoResult,
        qpsoRoutes,
        runQpsoOptimization,
        isOptimizing,
        optError,
        baselineCoverage,
        qpsoCoverage,
        incident,
        triggerIncident,
        isSimulatingIncident,
        rerouteResult,
        executeRerouting,
        isRerouting,
        activeVrpRoutes,
        currentStep,
        completedSteps,
        goToStep,
        nextStep,
        prevStep,
        restartDemo,
        canAdvance,
      }}
    >
      {children}
    </JuryDemoContext.Provider>
  );
}

export function useJuryDemo() {
  const context = useContext(JuryDemoContext);
  if (!context) {
    throw new Error("useJuryDemo must be used within a JuryDemoProvider");
  }
  return context;
}
