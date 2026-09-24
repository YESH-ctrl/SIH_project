// ─── Q-FLOW Client-Side Route Validator ──────────────────────────────────────
// Validates route geometry and provenance before rendering to MapLibre.
// Rejects unconstrained straight lines, fallback geometries, or corrupt data.
// ──────────────────────────────────────────────────────────────────────────────

export interface ClientRouteValidationResult {
  isValid: boolean;
  reason?: string;
  edgeCount: number;
  nodeCount: number;
  isFallback: boolean;
  geometrySource: string;
}

export function validateRouteForRendering(route: {
  geometry?: any;
  edge_ids?: string[];
  node_ids?: string[];
  validation?: {
    valid?: boolean;
    used_fallback_geometry?: boolean;
    used_graph_path?: boolean;
    constraints_valid?: boolean;
    blocked_edges_avoided?: boolean;
    one_way_legal?: boolean;
  };
  geometry_source?: string;
  feasible?: boolean;
}): ClientRouteValidationResult {
  if (!route) {
    return {
      isValid: false,
      reason: "Route object is null or undefined",
      edgeCount: 0,
      nodeCount: 0,
      isFallback: false,
      geometrySource: "NONE",
    };
  }

  // 1. Feasibility check
  if (route.feasible === false) {
    return {
      isValid: false,
      reason: "Route marked infeasible by optimizer/routing engine",
      edgeCount: 0,
      nodeCount: 0,
      isFallback: false,
      geometrySource: route.geometry_source || "UNKNOWN",
    };
  }

  // 2. Fallback geometry rejection (STRICT)
  if (
    route.validation?.used_fallback_geometry === true ||
    route.geometry_source === "FALLBACK_HAVERSINE" ||
    route.geometry_source === "STRAIGHT_LINE"
  ) {
    return {
      isValid: false,
      reason: "REJECTED: Contains forbidden straight-line/Haversine fallback geometry",
      edgeCount: route.edge_ids?.length || 0,
      nodeCount: route.node_ids?.length || 0,
      isFallback: true,
      geometrySource: "FALLBACK_HAVERSINE",
    };
  }

  // 3. Backend validation check
  if (route.validation && route.validation.valid === false) {
    return {
      isValid: false,
      reason: "Backend route validation failed (invalid road graph connectivity or constraints)",
      edgeCount: route.edge_ids?.length || 0,
      nodeCount: route.node_ids?.length || 0,
      isFallback: false,
      geometrySource: route.geometry_source || "UNKNOWN",
    };
  }

  // 4. Geometry structure check
  const geom = route.geometry;
  if (!geom) {
    return {
      isValid: false,
      reason: "Route geometry missing",
      edgeCount: 0,
      nodeCount: 0,
      isFallback: false,
      geometrySource: "NONE",
    };
  }

  if (geom.type !== "LineString" || !Array.isArray(geom.coordinates)) {
    return {
      isValid: false,
      reason: `Invalid geometry type: ${geom.type}, expected LineString`,
      edgeCount: 0,
      nodeCount: 0,
      isFallback: false,
      geometrySource: "UNKNOWN",
    };
  }

  const coords = geom.coordinates;
  if (coords.length < 2) {
    return {
      isValid: false,
      reason: `LineString contains fewer than 2 coordinates (${coords.length})`,
      edgeCount: 0,
      nodeCount: 0,
      isFallback: false,
      geometrySource: "EMPTY",
    };
  }

  // 5. Finite coordinate checks
  const allFinite = coords.every(
    (pt: any) =>
      Array.isArray(pt) &&
      pt.length >= 2 &&
      Number.isFinite(pt[0]) &&
      Number.isFinite(pt[1])
  );
  if (!allFinite) {
    return {
      isValid: false,
      reason: "Non-finite or corrupt coordinate values detected in route",
      edgeCount: 0,
      nodeCount: 0,
      isFallback: false,
      geometrySource: "CORRUPT",
    };
  }

  const edgeCount = Array.isArray(route.edge_ids) ? route.edge_ids.length : 0;
  const nodeCount = Array.isArray(route.node_ids) ? route.node_ids.length : 0;

  return {
    isValid: true,
    edgeCount,
    nodeCount,
    isFallback: false,
    geometrySource: route.geometry_source || "OSM_EDGE_GEOMETRY",
  };
}
