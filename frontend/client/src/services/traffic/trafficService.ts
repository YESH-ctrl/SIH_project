// ─── Q-FLOW Traffic Service ──────────────────────────────────────────────────
// High-level traffic service: token access, availability check, status tracking.
// ──────────────────────────────────────────────────────────────────────────────

import type { Map as MapLibreMap } from "maplibre-gl";
import * as maplibregl from "maplibre-gl";
import {
  MAPBOX_TRAFFIC_LAYER_ID,
  MAPBOX_TRAFFIC_SOURCE_LAYER,
  TRAFFIC_COLORS,
  type TrafficCongestionLevel,
} from "./trafficTypes";

// ─── Mapbox Token Access ─────────────────────────────────────────────────────

/**
 * Reads the Mapbox access token from the Vite environment variable.
 * Returns `null` if not configured.
 */
export function getMapboxToken(): string | null {
  const token = import.meta.env.VITE_MAPBOX_ACCESS_TOKEN;
  if (!token || token === "your-mapbox-access-token-here") {
    return null;
  }
  return token;
}

/**
 * Checks whether a valid Mapbox access token is configured.
 */
export function isMapboxAvailable(): boolean {
  return getMapboxToken() !== null;
}

// ─── Traffic Status ──────────────────────────────────────────────────────────

export interface TrafficStatus {
  /** Whether the traffic overlay is currently active */
  active: boolean;
  /** Whether the Mapbox token is configured */
  tokenConfigured: boolean;
  /** Timestamp (ms) of the last successful tile load/refresh */
  lastRefreshTimestamp: number | null;
  /** Error message if traffic source failed */
  errorMessage: string | null;
}

export function createInitialTrafficStatus(): TrafficStatus {
  return {
    active: false,
    tokenConfigured: isMapboxAvailable(),
    lastRefreshTimestamp: null,
    errorMessage: null,
  };
}

// ─── Traffic Road Click Popup ────────────────────────────────────────────────

/**
 * Registers a click handler on the traffic layer to display a popup with
 * congestion information for the clicked road segment.
 */
export function registerTrafficClickHandler(map: MapLibreMap): void {
  // Cursor style on hover
  map.on("mouseenter", MAPBOX_TRAFFIC_LAYER_ID, () => {
    map.getCanvas().style.cursor = "pointer";
  });
  map.on("mouseleave", MAPBOX_TRAFFIC_LAYER_ID, () => {
    map.getCanvas().style.cursor = "";
  });

  // Click popup
  map.on("click", MAPBOX_TRAFFIC_LAYER_ID, (e) => {
    if (!e.features || e.features.length === 0) return;

    const feature = e.features[0];
    const props = feature.properties || {};
    const congestion = (props.congestion || "unknown") as TrafficCongestionLevel;
    const roadClass = props.class || "Unknown";
    const isClosed = congestion === "unknown" && props.congestion_numeric === 0;
    const congestionColor = TRAFFIC_COLORS[congestion] || TRAFFIC_COLORS.unknown;

    const popupHtml = `
      <div style="background:#090d16; color:#ffffff; padding:10px 14px; font-family:'Courier New',monospace; font-size:11px; border:1.5px solid ${congestionColor}; border-radius:6px; box-shadow:0 0 16px rgba(0,0,0,0.8); min-width:180px;">
        <div style="font-weight:900; color:${congestionColor}; font-size:12px; text-transform:uppercase; display:flex; align-items:center; gap:6px; border-bottom:1px solid #1e293b; padding-bottom:6px; margin-bottom:6px;">
          <span style="width:8px; height:8px; border-radius:50%; background:${congestionColor}; display:inline-block;"></span>
          TRAFFIC
        </div>
        <div style="display:grid; grid-template-columns:auto 1fr; gap:4px 12px; align-items:center;">
          <span style="color:#64748b; font-size:10px;">Status:</span>
          <span style="font-weight:800; color:${congestionColor}; text-transform:capitalize;">${congestion}</span>
          <span style="color:#64748b; font-size:10px;">Road class:</span>
          <span style="font-weight:700; color:#e2e8f0; text-transform:capitalize;">${roadClass}</span>
          <span style="color:#64748b; font-size:10px;">Closed:</span>
          <span style="font-weight:700; color:${isClosed ? '#ef4444' : '#22c55e'};">${isClosed ? 'Yes' : 'No'}</span>
        </div>
        <div style="color:#475569; font-size:9px; margin-top:6px; padding-top:4px; border-top:1px solid #1e293b;">
          Source: Mapbox Traffic v1
        </div>
      </div>
    `;

    new maplibregl.Popup({
      closeButton: true,
      closeOnClick: true,
      offset: 10,
      className: "qflow-traffic-popup",
    })
      .setLngLat(e.lngLat)
      .setHTML(popupHtml)
      .addTo(map);
  });
}

// ─── Time-Since Formatter ────────────────────────────────────────────────────

/**
 * Formats a timestamp as "X min ago" or "just now".
 */
export function formatTimeSince(timestamp: number | null): string {
  if (!timestamp) return "N/A";
  const diffMs = Date.now() - timestamp;
  const diffMin = Math.floor(diffMs / 60_000);
  if (diffMin < 1) return "just now";
  if (diffMin === 1) return "1 min ago";
  return `${diffMin} min ago`;
}
