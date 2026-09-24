// ─── Q-FLOW Traffic Layer Management ─────────────────────────────────────────
// Functions to add/remove/toggle the Mapbox Traffic vector-tile source and
// layers on a MapLibre GL JS map instance.
//
// Uses Mapbox Vector Tile HTTP endpoints with proper minzoom (6) and maxzoom (14)
// so MapLibre GL JS automatically overzooms high-resolution zoom 14 traffic
// data at street zoom levels (14–20+).
// ──────────────────────────────────────────────────────────────────────────────

import type { Map as MapLibreMap } from "maplibre-gl";
import {
  MAPBOX_TRAFFIC_SOURCE_ID,
  MAPBOX_TRAFFIC_LAYER_ID,
  MAPBOX_TRAFFIC_CASING_ID,
  MAPBOX_TRAFFIC_SOURCE_LAYER,
  TrafficHealthStatus,
  INITIAL_TRAFFIC_HEALTH,
} from "./trafficTypes";
import {
  TRAFFIC_COLOR_EXPRESSION,
  TRAFFIC_LINE_WIDTH_EXPRESSION,
  TRAFFIC_CASING_WIDTH_EXPRESSION,
  TRAFFIC_LINE_OPACITY,
  TRAFFIC_LINE_LAYOUT,
} from "./trafficStyles";

// ─── Add Traffic Source ──────────────────────────────────────────────────────

/**
 * Adds the Mapbox Traffic v1 vector tile source to the map.
 * Sets minzoom: 6 and maxzoom: 14 matching Mapbox's tile pyramid, allowing
 * MapLibre to gracefully overzoom street detail at zooms 14-22.
 *
 * @returns `true` if the source was added (or already existed), `false` on error.
 */
export function addTrafficSource(map: MapLibreMap, accessToken: string): boolean {
  try {
    if (map.getSource(MAPBOX_TRAFFIC_SOURCE_ID)) {
      console.log("[Q-FLOW Traffic] Source already exists");
      return true;
    }

    map.addSource(MAPBOX_TRAFFIC_SOURCE_ID, {
      type: "vector",
      tiles: [
        `https://api.mapbox.com/v4/mapbox.mapbox-traffic-v1/{z}/{x}/{y}.mvt?access_token=${accessToken}`,
      ],
      minzoom: 6,
      maxzoom: 14,
    });

    console.log("[Q-FLOW Traffic] ✅ Vector tile source added (zoom 6-14 with overzooming)");
    return true;
  } catch (err) {
    console.error("[Q-FLOW Traffic] Failed to add traffic source:", err);
    return false;
  }
}

// ─── Add Traffic Layers ──────────────────────────────────────────────────────

/**
 * Adds the traffic line layer and its dark casing outline to the map.
 * The layers are inserted BEFORE `beforeLayerId` to control z-order.
 *
 * @param beforeLayerId - Layer ID to insert the traffic layer before.
 *   Typically "nodes-layer" so traffic appears above roads but below nodes/routes.
 */
export function addTrafficLayer(
  map: MapLibreMap,
  beforeLayerId?: string,
): boolean {
  try {
    if (!map.getSource(MAPBOX_TRAFFIC_SOURCE_ID)) {
      console.warn("[Q-FLOW Traffic] Cannot add layers — source not found");
      return false;
    }

    if (map.getLayer(MAPBOX_TRAFFIC_LAYER_ID) && map.getLayer(MAPBOX_TRAFFIC_CASING_ID)) {
      return true;
    }

    const hasTarget = Boolean(beforeLayerId && map.getLayer(beforeLayerId));

    // 1. Dark casing underlay (makes traffic colors pop against any basemap)
    if (!map.getLayer(MAPBOX_TRAFFIC_CASING_ID)) {
      const casingDef: Parameters<MapLibreMap["addLayer"]>[0] = {
        id: MAPBOX_TRAFFIC_CASING_ID,
        type: "line",
        source: MAPBOX_TRAFFIC_SOURCE_ID,
        "source-layer": MAPBOX_TRAFFIC_SOURCE_LAYER,
        layout: TRAFFIC_LINE_LAYOUT,
        paint: {
          "line-color": "#020617",
          "line-width": TRAFFIC_CASING_WIDTH_EXPRESSION,
          "line-opacity": 0.55,
        },
      };
      if (hasTarget) {
        map.addLayer(casingDef, beforeLayerId);
      } else {
        map.addLayer(casingDef);
      }
    }

    // 2. Main congestion-colored line
    if (!map.getLayer(MAPBOX_TRAFFIC_LAYER_ID)) {
      const lineDef: Parameters<MapLibreMap["addLayer"]>[0] = {
        id: MAPBOX_TRAFFIC_LAYER_ID,
        type: "line",
        source: MAPBOX_TRAFFIC_SOURCE_ID,
        "source-layer": MAPBOX_TRAFFIC_SOURCE_LAYER,
        layout: TRAFFIC_LINE_LAYOUT,
        paint: {
          "line-color": TRAFFIC_COLOR_EXPRESSION,
          "line-width": TRAFFIC_LINE_WIDTH_EXPRESSION,
          "line-opacity": TRAFFIC_LINE_OPACITY,
        },
      };
      if (hasTarget) {
        map.addLayer(lineDef, beforeLayerId);
      } else {
        map.addLayer(lineDef);
      }
    }

    console.log("[Q-FLOW Traffic] ✅ Traffic line & casing layers added");
    return true;
  } catch (err) {
    console.error("[Q-FLOW Traffic] Failed to add traffic layers:", err);
    return false;
  }
}

// ─── Remove Traffic Layers ───────────────────────────────────────────────────

/**
 * Removes the traffic layers and source from the map.
 */
export function removeTrafficLayers(map: MapLibreMap): void {
  try {
    if (map.getLayer(MAPBOX_TRAFFIC_LAYER_ID)) {
      map.removeLayer(MAPBOX_TRAFFIC_LAYER_ID);
    }
    if (map.getLayer(MAPBOX_TRAFFIC_CASING_ID)) {
      map.removeLayer(MAPBOX_TRAFFIC_CASING_ID);
    }
    if (map.getSource(MAPBOX_TRAFFIC_SOURCE_ID)) {
      map.removeSource(MAPBOX_TRAFFIC_SOURCE_ID);
    }
    console.log("[Q-FLOW Traffic] Layers and source removed");
  } catch (err) {
    console.error("[Q-FLOW Traffic] Error removing layers:", err);
  }
}

// ─── Toggle Visibility ──────────────────────────────────────────────────────

/**
 * Shows or hides the traffic layers without removing them from the map.
 */
export function setTrafficVisibility(map: MapLibreMap, visible: boolean): void {
  try {
    const vis = visible ? "visible" : "none";
    if (map.getLayer(MAPBOX_TRAFFIC_LAYER_ID)) {
      map.setLayoutProperty(MAPBOX_TRAFFIC_LAYER_ID, "visibility", vis);
    }
    if (map.getLayer(MAPBOX_TRAFFIC_CASING_ID)) {
      map.setLayoutProperty(MAPBOX_TRAFFIC_CASING_ID, "visibility", vis);
    }
  } catch (err) {
    console.error("[Q-FLOW Traffic] Error toggling visibility:", err);
  }
}

// ─── Refresh Traffic Tiles ───────────────────────────────────────────────────

/**
 * Forces the map to re-fetch traffic vector tiles without destroying the
 * map instance. Uses MapLibre's tile-cache clearing mechanism.
 *
 * @returns timestamp (ms) of the refresh, or `null` on failure.
 */
export function refreshTrafficSource(map: MapLibreMap): number | null {
  try {
    const source = map.getSource(MAPBOX_TRAFFIC_SOURCE_ID);
    if (!source) {
      console.warn("[Q-FLOW Traffic] Cannot refresh — source not found");
      return null;
    }

    const style = map.getStyle();
    const srcDef = style?.sources?.[MAPBOX_TRAFFIC_SOURCE_ID] as any;
    if (srcDef?.tiles?.[0]) {
      const baseUrl = srcDef.tiles[0].replace(/&_t=\d+/, "");
      const now = Date.now();
      srcDef.tiles = [`${baseUrl}&_t=${now}`];

      // Re-set the source style to trigger tile reload
      (source as any).setTiles?.(srcDef.tiles);
    }

    const ts = Date.now();
    console.log("[Q-FLOW Traffic] ✅ Traffic tiles refreshed at", new Date(ts).toLocaleTimeString());
    return ts;
  } catch (err) {
    console.error("[Q-FLOW Traffic] Error refreshing tiles:", err);
    return null;
  }
}

// ─── Runtime Traffic Health Monitoring & Verification ────────────────────────

/**
 * Attaches runtime event instrumentation to the MapLibre map to detect:
 * 1. Whether Mapbox vector tile requests are genuinely dispatched and succeed
 * 2. Auth/Licensing errors (HTTP 401/403) from Mapbox API
 * 3. Whether traffic line features actually exist in the current viewport
 * 4. Accurate data freshness (~8 min refresh interval per Mapbox Traffic v1 spec)
 *
 * Returns an unmount / cleanup callback to remove map listeners.
 */
export function setupTrafficMonitoring(
  map: MapLibreMap,
  accessToken: string | undefined | null,
  onStatusChange: (status: TrafficHealthStatus) => void
): () => void {
  const isConfigured = Boolean(
    accessToken &&
    accessToken.trim().length > 15 &&
    !accessToken.includes("your-mapbox-access-token-here") &&
    !accessToken.includes("placeholder")
  );

  const currentStatus: TrafficHealthStatus = {
    ...INITIAL_TRAFFIC_HEALTH,
    configured: isConfigured,
    sourceAdded: Boolean(map.getSource(MAPBOX_TRAFFIC_SOURCE_ID)),
    status: isConfigured ? "LOADING" : "NO_TOKEN",
    errorMessage: isConfigured
      ? null
      : "Mapbox access token missing or unconfigured in environment",
  };

  const emit = () => {
    onStatusChange({ ...currentStatus });
  };

  emit();

  if (!isConfigured) {
    return () => {};
  }

  const checkFeatures = () => {
    if (!map.getLayer(MAPBOX_TRAFFIC_LAYER_ID)) return;
    try {
      const rendered = map.queryRenderedFeatures(undefined, {
        layers: [MAPBOX_TRAFFIC_LAYER_ID],
      });
      currentStatus.featuresObserved = rendered.length;
      if (rendered.length > 0) {
        currentStatus.status = "LIVE";
        currentStatus.lastSuccessfulTileTime = Date.now();
        currentStatus.coverageError = false;
        currentStatus.errorMessage = null;
      } else if (currentStatus.sourceLoaded && !currentStatus.tokenError && currentStatus.status !== "ERROR") {
        currentStatus.status = "NO_DATA";
        currentStatus.coverageError = true;
        currentStatus.errorMessage = "No traffic vector features returned for current viewport";
      }
      emit();
    } catch {
      // Layer may be in the middle of being re-added
    }
  };

  const onDataLoading = (e: any) => {
    if (e.sourceId === MAPBOX_TRAFFIC_SOURCE_ID || (e.dataType === "source" && e.sourceId === MAPBOX_TRAFFIC_SOURCE_ID)) {
      currentStatus.tileRequestsSeen += 1;
      emit();
    }
  };

  const onSourceData = (e: any) => {
    if (e.sourceId === MAPBOX_TRAFFIC_SOURCE_ID) {
      currentStatus.sourceAdded = true;
      const isLoaded = map.isSourceLoaded(MAPBOX_TRAFFIC_SOURCE_ID);
      currentStatus.sourceLoaded = isLoaded;
      if (e.isSourceLoaded) {
        currentStatus.successfulTileRequests += 1;
        checkFeatures();
      }
      emit();
    }
  };

  const onError = (e: any) => {
    const err = e?.error;
    const msg: string = (err?.message || (typeof e?.error === "string" ? e.error : "") || "").toLowerCase();
    const status: number | undefined = err?.status || (err as any)?.statusCode;

    // Check if error is related to Mapbox traffic tileset
    if (
      msg.includes("mapbox") ||
      msg.includes("traffic") ||
      status === 401 ||
      status === 403 ||
      msg.includes("401") ||
      msg.includes("403") ||
      msg.includes("unauthorized") ||
      msg.includes("forbidden")
    ) {
      currentStatus.failedTileRequests += 1;
      if (status === 401 || status === 403 || msg.includes("401") || msg.includes("403") || msg.includes("unauthorized") || msg.includes("forbidden")) {
        currentStatus.tokenError = true;
        currentStatus.status = "TOKEN_ERROR";
        currentStatus.errorMessage = `Mapbox Auth Error ${status || 401}: Invalid or unauthorized token for Traffic v1 tileset`;
      } else {
        currentStatus.status = "ERROR";
        currentStatus.errorMessage = err?.message || "Traffic tile network request failed";
      }
      emit();
    }
  };

  map.on("dataloading", onDataLoading);
  map.on("sourcedata", onSourceData);
  map.on("error", onError);
  map.on("moveend", checkFeatures);
  map.on("idle", checkFeatures);

  // Poll once shortly after attaching
  const timer = setTimeout(() => {
    if (map.getSource(MAPBOX_TRAFFIC_SOURCE_ID)) {
      currentStatus.sourceAdded = true;
      currentStatus.sourceLoaded = map.isSourceLoaded(MAPBOX_TRAFFIC_SOURCE_ID);
      checkFeatures();
    }
  }, 1200);

  return () => {
    clearTimeout(timer);
    map.off("dataloading", onDataLoading);
    map.off("sourcedata", onSourceData);
    map.off("error", onError);
    map.off("moveend", checkFeatures);
    map.off("idle", checkFeatures);
  };
}

