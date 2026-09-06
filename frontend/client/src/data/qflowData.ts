export interface Vehicle {
  id: string;
  name: string;
  type: "Delivery Truck" | "Heavy Truck" | "Van" | "Bus";
  capacityKg: number;
  currentLoadKg: number;
  status: "Active" | "Delayed" | "Optimized" | "Affected" | "Idle";
  currentLocation: string;
  nextStop: string;
  eta: string;
  routeId: string;
  lat: number;
  lng: number;
}

export interface DeliveryPoint {
  id: string;
  customerName: string;
  lat: number;
  lng: number;
  demandKg: number;
  timeWindow: string;
  priority: "High" | "Standard";
  assignedVehicleId: string;
  status: "Pending" | "In Transit" | "Delivered";
}

export interface Depot {
  id: string;
  name: string;
  lat: number;
  lng: number;
  capacityVehicles: number;
}

export interface TrafficSegment {
  id: string;
  roadName: string;
  lengthKm: number;
  currentSpeedKmh: number;
  freeFlowSpeedKmh: number;
  flowVehHr: number;
  capacityVehHr: number;
  congestionLevel: "Low" | "Moderate" | "High" | "Severe";
  predictedTravelTimeMin: number;
  coordinates: [number, number][];
}

export interface TrafficIncident {
  id: string;
  title: string;
  roadName: string;
  type: "Accident" | "Roadwork" | "Congestion Spike" | "Weather Hazard";
  severity: "High" | "Moderate" | "Low";
  detectedTime: string;
  affectedVehiclesCount: number;
  affectedRoutesCount: number;
  affectedCustomersCount: number;
  affectedZone: string;
  status: "Active" | "Reoptimization Required" | "Resolved";
  lat: number;
  lng: number;
}

export interface OptimizationRun {
  id: string;
  date: string;
  vehiclesCount: number;
  customersCount: number;
  algorithm: string;
  fitness: number;
  runtimeSec: number;
  status: "Completed" | "Warm-Started" | "Failed";
  travelTimeSavedPercent: number;
}

export interface BenchmarkResult {
  algorithm: string;
  fullName: string;
  travelTimeMin: number;
  distanceKm: number;
  runtimeSec: number;
  convergenceIteration: number;
  feasibilityRatePercent: number;
  isQPSO?: boolean;
}

export interface Restriction {
  id: string;
  zoneName: string;
  restrictionType: string;
  description: string;
  timeRange: string;
  status: "ACTIVE" | "PENDING";
  lat: number;
  lng: number;
}

// =============================================================================
// RAJPUR URBAN NETWORK DEMO DATA
// =============================================================================

export class QFlowDataStore {
  // Depots
  static depots: Depot[] = [
    { id: "DEP-01", name: "Central Hub Depot", lat: 21.2514, lng: 81.6296, capacityVehicles: 25 },
    { id: "DEP-02", name: "North Logistics Center", lat: 21.278, lng: 81.645, capacityVehicles: 15 },
    { id: "DEP-03", name: "South Industrial Terminal", lat: 21.221, lng: 81.615, capacityVehicles: 20 },
  ];

  // Vehicles (40 Vehicles)
  static vehicles: Vehicle[] = Array.from({ length: 40 }, (_, index) => {
    const idNum = String(index + 1).padStart(3, "0");
    const isAffected = index < 6;
    const isDelayed = index >= 6 && index < 9;
    const types: Vehicle["type"][] = ["Delivery Truck", "Heavy Truck", "Van", "Bus"];
    const type = types[index % 4];
    const capacity = type === "Heavy Truck" ? 12000 : type === "Delivery Truck" ? 5000 : type === "Van" ? 2500 : 3500;
    
    // Spread around Raipur / Rajpur coordinates (21.25, 81.63)
    const latOffset = (Math.sin(index) * 0.04).toFixed(4);
    const lngOffset = (Math.cos(index) * 0.04).toFixed(4);

    return {
      id: `V-${idNum}`,
      name: `Vehicle ${idNum}`,
      type,
      capacityKg: capacity,
      currentLoadKg: Math.floor(capacity * (0.6 + (index % 3) * 0.12)),
      status: isAffected ? "Affected" : isDelayed ? "Delayed" : "Active",
      currentLocation: isAffected ? "E17 Junction (Congested)" : `Sector ${1 + (index % 8)} Corridor`,
      nextStop: `Customer C-${100 + (index * 7) % 200}`,
      eta: `09:${(15 + (index * 3) % 40).toString().padStart(2, "0")}`,
      routeId: `R-${idNum}`,
      lat: 21.2514 + parseFloat(latOffset),
      lng: 81.6296 + parseFloat(lngOffset),
    };
  });

  // Traffic Incidents
  static incidents: TrafficIncident[] = [
    {
      id: "INC-904",
      title: "Vehicle Accident on Express Corridor E17",
      roadName: "Express Road E17",
      type: "Accident",
      severity: "High",
      detectedTime: "08:42 AM",
      affectedVehiclesCount: 6,
      affectedRoutesCount: 4,
      affectedCustomersCount: 24,
      affectedZone: "Zone 3 (East)",
      status: "Reoptimization Required",
      lat: 21.258,
      lng: 81.642,
    },
    {
      id: "INC-881",
      title: "Utility Roadwork Restriction",
      roadName: "Ring Road East",
      type: "Roadwork",
      severity: "Moderate",
      detectedTime: "07:30 AM",
      affectedVehiclesCount: 2,
      affectedRoutesCount: 2,
      affectedCustomersCount: 10,
      affectedZone: "Zone 2 (North-East)",
      status: "Active",
      lat: 21.272,
      lng: 81.651,
    },
  ];

  // Road Segments
  static trafficSegments: TrafficSegment[] = [
    {
      id: "SEG-E17",
      roadName: "Express Road E17",
      lengthKm: 2.4,
      currentSpeedKmh: 14,
      freeFlowSpeedKmh: 45,
      flowVehHr: 1420,
      capacityVehHr: 1200,
      congestionLevel: "Severe",
      predictedTravelTimeMin: 10.2,
      coordinates: [[21.252, 81.635], [21.258, 81.642], [21.264, 81.648]],
    },
    {
      id: "SEG-RRE",
      roadName: "Ring Road East",
      lengthKm: 4.1,
      currentSpeedKmh: 28,
      freeFlowSpeedKmh: 55,
      flowVehHr: 980,
      capacityVehHr: 1500,
      congestionLevel: "Moderate",
      predictedTravelTimeMin: 8.8,
      coordinates: [[21.264, 81.648], [21.272, 81.651], [21.280, 81.655]],
    },
    {
      id: "SEG-CEN",
      roadName: "Central Arterial Boulevard",
      lengthKm: 1.8,
      currentSpeedKmh: 36,
      freeFlowSpeedKmh: 40,
      flowVehHr: 720,
      capacityVehHr: 1100,
      congestionLevel: "Low",
      predictedTravelTimeMin: 3.0,
      coordinates: [[21.245, 81.625], [21.251, 81.629], [21.258, 81.634]],
    },
    {
      id: "SEG-IND",
      roadName: "South Industrial Connector",
      lengthKm: 3.2,
      currentSpeedKmh: 42,
      freeFlowSpeedKmh: 50,
      flowVehHr: 540,
      capacityVehHr: 1400,
      congestionLevel: "Low",
      predictedTravelTimeMin: 4.6,
      coordinates: [[21.221, 81.615], [21.233, 81.620], [21.245, 81.625]],
    },
  ];

  // Benchmark Comparative Data
  static benchmarks: BenchmarkResult[] = [
    {
      algorithm: "QPSO",
      fullName: "Quantum-Inspired Particle Swarm Optimization",
      travelTimeMin: 298.4,
      distanceKm: 342.1,
      runtimeSec: 8.4,
      convergenceIteration: 64,
      feasibilityRatePercent: 100,
      isQPSO: true,
    },
    {
      algorithm: "PSO",
      fullName: "Standard Particle Swarm Optimization",
      travelTimeMin: 345.8,
      distanceKm: 388.2,
      runtimeSec: 14.2,
      convergenceIteration: 120,
      feasibilityRatePercent: 94,
    },
    {
      algorithm: "GA",
      fullName: "Genetic Algorithm (NSGA-II)",
      travelTimeMin: 362.1,
      distanceKm: 395.0,
      runtimeSec: 28.6,
      convergenceIteration: 180,
      feasibilityRatePercent: 91,
    },
    {
      algorithm: "ACO",
      fullName: "Ant Colony Optimization",
      travelTimeMin: 338.0,
      distanceKm: 374.5,
      runtimeSec: 22.1,
      convergenceIteration: 110,
      feasibilityRatePercent: 96,
    },
    {
      algorithm: "Tabu Search",
      fullName: "Tabu Search Metaheuristic",
      travelTimeMin: 351.0,
      distanceKm: 389.0,
      runtimeSec: 19.5,
      convergenceIteration: 140,
      feasibilityRatePercent: 92,
    },
  ];

  // Optimization Runs History
  static history: OptimizationRun[] = [
    {
      id: "RUN-2026-0905-01",
      date: "2026-09-05 08:31 AM",
      vehiclesCount: 40,
      customersCount: 300,
      algorithm: "QPSO (Cold Start)",
      fitness: 12483,
      runtimeSec: 8.4,
      status: "Completed",
      travelTimeSavedPercent: 21.8,
    },
    {
      id: "RUN-2026-0904-04",
      date: "2026-09-04 05:15 PM",
      vehiclesCount: 40,
      customersCount: 295,
      algorithm: "QPSO (Warm Start)",
      fitness: 12610,
      runtimeSec: 2.1,
      status: "Warm-Started",
      travelTimeSavedPercent: 19.4,
    },
    {
      id: "RUN-2026-0904-03",
      date: "2026-09-04 01:20 PM",
      vehiclesCount: 38,
      customersCount: 280,
      algorithm: "QPSO (Cold Start)",
      fitness: 13120,
      runtimeSec: 7.9,
      status: "Completed",
      travelTimeSavedPercent: 20.2,
    },
  ];

  // Road Restrictions
  static restrictions: Restriction[] = [
    {
      id: "RST-01",
      zoneName: "Old City Zone",
      restrictionType: "Heavy Vehicle Axle Limit",
      description: "Vehicles > 7.5T prohibited between 08:00 and 11:00 AM",
      timeRange: "08:00 AM – 11:00 AM",
      status: "ACTIVE",
      lat: 21.248,
      lng: 81.632,
    },
    {
      id: "RST-02",
      zoneName: "Heritage Market Corridor",
      restrictionType: "Low Emission Zone",
      description: "Euro VI compliant or Electric Vehicles only",
      timeRange: "24 / 7",
      status: "ACTIVE",
      lat: 21.255,
      lng: 81.628,
    },
  ];
}
