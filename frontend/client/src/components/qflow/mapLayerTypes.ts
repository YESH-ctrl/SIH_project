// ─── Q-FLOW Map Layer Types & State Management ────────────────────────────────
// Centralized layer visibility model for Jury Demo Map & Network Map.
// Controls independent visibility of all underlying MapLibre layers.
// ──────────────────────────────────────────────────────────────────────────────

export type MapLayerKey =
  | "basemap"
  | "roadNetwork"
  | "nodes"
  | "traffic"
  | "route"
  | "baselineRoutes"
  | "optimizedRoutes"
  | "oldRoute"
  | "reroutedRoute"
  | "vehicles"
  | "depot"
  | "deliveryPoints"
  | "incidents"
  | "turnMarkers"
  | "labels";

export type LayerVisibilityState = Record<MapLayerKey, boolean>;

export const DEFAULT_LAYER_VISIBILITY: LayerVisibilityState = {
  basemap: true,
  roadNetwork: false,
  nodes: false,
  traffic: true,
  route: true,
  baselineRoutes: true,
  optimizedRoutes: true,
  oldRoute: true,
  reroutedRoute: true,
  vehicles: true,
  depot: true,
  deliveryPoints: true,
  incidents: true,
  turnMarkers: true,
  labels: true,
};

export interface LayerMetadata {
  key: MapLayerKey;
  label: string;
  shortLabel: string;
  description: string;
  category: "BASE" | "NETWORK" | "TRAFFIC" | "VRP" | "MARKERS";
  color: string;
  mapLibreLayerIds: string[];
}

export const MAP_LAYERS_METADATA: LayerMetadata[] = [
  {
    key: "basemap",
    label: "OSM Basemap",
    shortLabel: "BASE",
    description: "CartoDB Dark Matter / Positron OSM raster tiles",
    category: "BASE",
    color: "#64748b",
    mapLibreLayerIds: ["osm-tiles-layer", "osm-basemap-layer"],
  },
  {
    key: "roadNetwork",
    label: "Road Network",
    shortLabel: "ROADS",
    description: "Local, secondary, primary OSM road graph edges",
    category: "NETWORK",
    color: "#06b6d4",
    mapLibreLayerIds: [
      "edges-casing",
      "edges-local",
      "edges-secondary",
      "edges-primary",
      "edges-glow",
      "edges-click-target",
    ],
  },
  {
    key: "nodes",
    label: "Graph Nodes",
    shortLabel: "NODES",
    description: "OSM network graph junctions & intersections",
    category: "NETWORK",
    color: "#3b82f6",
    mapLibreLayerIds: ["nodes-layer", "nodes-label"],
  },
  {
    key: "traffic",
    label: "Mapbox Traffic",
    shortLabel: "TRAFFIC",
    description: "Mapbox Traffic v1 vector congestion tileset",
    category: "TRAFFIC",
    color: "#eab308",
    mapLibreLayerIds: ["mapbox-traffic-casing", "mapbox-traffic-line"],
  },
  {
    key: "route",
    label: "A→B Route",
    shortLabel: "ROUTE",
    description: "Single-origin point-to-point shortest path",
    category: "NETWORK",
    color: "#10b981",
    mapLibreLayerIds: [
      "route-glow",
      "route-casing",
      "route-line",
      "route-arrows",
    ],
  },
  {
    key: "baselineRoutes",
    label: "Baseline Routes",
    shortLabel: "BASELINE",
    description: "Pre-quantum baseline vehicle routes (Greedy/Dijkstra)",
    category: "VRP",
    color: "#f97316",
    mapLibreLayerIds: ["qflow-vrp-casing-baseline", "qflow-vrp-line-baseline"],
  },
  {
    key: "optimizedRoutes",
    label: "QPSO Routes",
    shortLabel: "OPTIMIZED",
    description: "Quantum-inspired particle swarm optimized routes",
    category: "VRP",
    color: "#8b5cf6",
    mapLibreLayerIds: [
      "qflow-vrp-casing-active",
      "qflow-vrp-line-active",
      "qflow-vrp-glow-active",
      "qflow-vrp-casing",
      "qflow-vrp-line",
      "qflow-vrp-glow",
    ],
  },
  {
    key: "oldRoute",
    label: "Old Incident Route",
    shortLabel: "OLD ROUTE",
    description: "Previous route prior to disruption (dashed)",
    category: "VRP",
    color: "#ef4444",
    mapLibreLayerIds: ["reroute-old-casing", "reroute-old-line"],
  },
  {
    key: "reroutedRoute",
    label: "Rerouted Path",
    shortLabel: "NEW ROUTE",
    description: "Dynamic obstacle-avoidance rerouted path",
    category: "VRP",
    color: "#10b981",
    mapLibreLayerIds: [
      "reroute-new-casing",
      "reroute-new-line",
      "reroute-new-glow",
    ],
  },
  {
    key: "vehicles",
    label: "Vehicle Markers",
    shortLabel: "VEHICLES",
    description: "Fleet vehicles live GPS positions & headings",
    category: "MARKERS",
    color: "#06b6d4",
    mapLibreLayerIds: ["qflow-vehicle-markers"],
  },
  {
    key: "depot",
    label: "Central Depot",
    shortLabel: "DEPOT",
    description: "Distribution hub / dispatch terminal location",
    category: "MARKERS",
    color: "#ec4899",
    mapLibreLayerIds: ["qflow-depot-marker"],
  },
  {
    key: "deliveryPoints",
    label: "Customer Stops",
    shortLabel: "STOPS",
    description: "VRP delivery waypoints & customer locations",
    category: "MARKERS",
    color: "#38bdf8",
    mapLibreLayerIds: ["qflow-stops-marker"],
  },
  {
    key: "incidents",
    label: "Incidents & Blocks",
    shortLabel: "INCIDENTS",
    description: "Active road blockades, accidents & restriction zones",
    category: "MARKERS",
    color: "#ef4444",
    mapLibreLayerIds: [
      "incident-point",
      "incident-ripple",
      "incident-blocked-edge",
      "incident-blocked-edge-casing",
    ],
  },
  {
    key: "turnMarkers",
    label: "Turn Guidance",
    shortLabel: "TURNS",
    description: "Maneuver guidance icons along active path",
    category: "MARKERS",
    color: "#a855f7",
    mapLibreLayerIds: ["route-turn-markers"],
  },
  {
    key: "labels",
    label: "Map Labels",
    shortLabel: "LABELS",
    description: "Street names, road classifications, and node labels",
    category: "BASE",
    color: "#94a3b8",
    mapLibreLayerIds: ["nodes-label", "road-labels", "osm-labels"],
  },
];
