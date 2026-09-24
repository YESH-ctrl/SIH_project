// ─── Q-FLOW Traffic Styles ────────────────────────────────────────────────────
// MapLibre style expressions for the Mapbox Traffic vector-tile layer.
// Designed to match the thick, vibrant traffic visualization in reference 2.
// ──────────────────────────────────────────────────────────────────────────────

import type { ExpressionSpecification } from "maplibre-gl";
import { TRAFFIC_COLORS } from "./trafficTypes";

/**
 * Data-driven color expression using the `congestion` property from
 * Mapbox Traffic v1 vector tiles.
 *
 * Uses 'case' expressions to prevent failures if congestion is undefined or null,
 * mapping:
 *   low      → vibrant green (#20c85a)
 *   moderate → vibrant yellow (#ffd400)
 *   heavy    → vibrant orange (#ff8c00)
 *   severe   → vibrant red    (#e53935)
 *   closed   → deep dark red  (#7f1d1d)
 *   fallback → vibrant green (default free-flow)
 */
export const TRAFFIC_COLOR_EXPRESSION: ExpressionSpecification = [
  "case",
  ["==", ["get", "congestion"], "severe"], TRAFFIC_COLORS.severe,
  ["==", ["get", "congestion"], "heavy"], TRAFFIC_COLORS.heavy,
  ["==", ["get", "congestion"], "moderate"], TRAFFIC_COLORS.moderate,
  ["==", ["get", "congestion"], "low"], TRAFFIC_COLORS.low,
  ["any", ["==", ["get", "closed"], true], ["==", ["get", "closed"], "yes"]], TRAFFIC_COLORS.closed,
  TRAFFIC_COLORS.low, // fallback to green free-flow
];

/**
 * Bold, prominent line width expression matching the reference traffic overlay.
 * Scales smoothly from overview to street-level inspection.
 */
export const TRAFFIC_LINE_WIDTH_EXPRESSION: ExpressionSpecification = [
  "interpolate",
  ["linear"],
  ["zoom"],
  6,  2.5,
  8,  4.0,
  10, 5.5,
  12, 7.5,
  14, 10.0,
  16, 13.0,
  18, 16.0,
];

/**
 * Slightly wider dark casing underlay to make colors pop against raster OSM map.
 */
export const TRAFFIC_CASING_WIDTH_EXPRESSION: ExpressionSpecification = [
  "interpolate",
  ["linear"],
  ["zoom"],
  6,  4.5,
  8,  6.0,
  10, 8.0,
  12, 10.5,
  14, 13.5,
  16, 17.0,
  18, 21.0,
];

/**
 * High opacity for clear, vibrant road coverage.
 */
export const TRAFFIC_LINE_OPACITY = 0.95;

/**
 * Line cap and join for smooth rendering.
 */
export const TRAFFIC_LINE_LAYOUT = {
  "line-cap": "round" as const,
  "line-join": "round" as const,
};
