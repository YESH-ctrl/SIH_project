// ─── Q-FLOW Traffic Types ─────────────────────────────────────────────────────
// TypeScript interfaces and constants for Mapbox Traffic vector-tile integration.
// Designed for future SUMO + quantum-inspired routing consumption.
// ──────────────────────────────────────────────────────────────────────────────

/**
 * Mapbox Traffic congestion levels as reported by the `congestion` property
 * on features in the `mapbox.mapbox-traffic-v1` tileset.
 */
export type TrafficCongestionLevel =
  | "low"
  | "moderate"
  | "heavy"
  | "severe"
  | "unknown";

/**
 * Normalized traffic segment for future consumption by the route-optimization
 * pipeline (SUMO → QPSO → dynamic re-routing).
 */
export interface TrafficSegmentData {
  /** Unique identifier (typically derived from tile feature id) */
  id: string;
  /** Congestion level from Mapbox Traffic */
  congestion: TrafficCongestionLevel;
  /** Whether the road is reported as closed */
  closed: boolean;
  /** Mapbox road class (e.g. "motorway", "primary", "street") */
  roadClass?: string;
  /** GeoJSON geometry (if extracted from the feature) */
  geometry?: unknown;
  /** Unix timestamp (ms) when this data was captured/refreshed */
  timestamp: number;
}

// ─── Congestion → Color Mapping ──────────────────────────────────────────────

export const TRAFFIC_COLORS: Record<TrafficCongestionLevel | "closed", string> = {
  low:      "#20c85a",   // Green — free flow
  moderate: "#ffd400",   // Yellow — moderate
  heavy:    "#ff8c00",   // Orange — heavy
  severe:   "#e53935",   // Red — severe congestion
  unknown:  "#7f1d1d",   // Dark red fallback
  closed:   "#7f1d1d",   // Dark red — road closed
};

// ─── Congestion → Travel-Cost Multiplier ─────────────────────────────────────
// Used by the future quantum-inspired route optimizer to weight edges.

export const TRAFFIC_COST_MULTIPLIERS: Record<TrafficCongestionLevel | "closed", number> = {
  low:      1.0,
  moderate: 1.25,
  heavy:    1.75,
  severe:   3.0,
  unknown:  1.0,
  closed:   Infinity,
};

// ─── Traffic Legend Entries ───────────────────────────────────────────────────

export const TRAFFIC_LEGEND_ENTRIES: { label: string; color: string }[] = [
  { label: "Free Flow",   color: TRAFFIC_COLORS.low },
  { label: "Moderate",    color: TRAFFIC_COLORS.moderate },
  { label: "Heavy",       color: TRAFFIC_COLORS.heavy },
  { label: "Severe",      color: TRAFFIC_COLORS.severe },
  { label: "Closed",      color: TRAFFIC_COLORS.closed },
];

// ─── Source / Layer IDs (canonical) ──────────────────────────────────────────

export const MAPBOX_TRAFFIC_SOURCE_ID = "mapbox-traffic";
export const MAPBOX_TRAFFIC_LAYER_ID  = "mapbox-traffic-line";
export const MAPBOX_TRAFFIC_CASING_ID = "mapbox-traffic-casing";
export const MAPBOX_TRAFFIC_SOURCE_LAYER = "traffic";

// ─── Mapbox Traffic Health & Runtime Verification ────────────────────────────

export type TrafficStatusType =
  | "LIVE"
  | "NO_TOKEN"
  | "TOKEN_ERROR"
  | "NO_DATA"
  | "LOADING"
  | "ERROR"
  | "IDLE";

export interface TrafficHealthStatus {
  configured: boolean;
  sourceAdded: boolean;
  sourceLoaded: boolean;
  tileRequestsSeen: number;
  successfulTileRequests: number;
  failedTileRequests: number;
  featuresObserved: number;
  lastSuccessfulTileTime: number | null;
  tokenError: boolean;
  coverageError: boolean;
  errorMessage: string | null;
  status: TrafficStatusType;
}

export const INITIAL_TRAFFIC_HEALTH: TrafficHealthStatus = {
  configured: false,
  sourceAdded: false,
  sourceLoaded: false,
  tileRequestsSeen: 0,
  successfulTileRequests: 0,
  failedTileRequests: 0,
  featuresObserved: 0,
  lastSuccessfulTileTime: null,
  tokenError: false,
  coverageError: false,
  errorMessage: null,
  status: "IDLE",
};

