import React, { useEffect, useRef, useState } from "react";
import * as maplibregl from "maplibre-gl";
import type { Feature, FeatureCollection } from "geojson";
import "maplibre-gl/dist/maplibre-gl.css";
import { NetworkNodeDTO, NetworkEdgeDTO, ShortestPathRouteResponse } from "@/services/apiClient";
import { Layers, ZoomIn, ZoomOut, Maximize2, RotateCcw, Activity } from "lucide-react";


interface OSMVectorNetworkMapProps {
  nodes: NetworkNodeDTO[];
  edges: NetworkEdgeDTO[];
  selectedEdge: NetworkEdgeDTO | null;
  selectedNode: NetworkNodeDTO | null;
  routeResponse: ShortestPathRouteResponse | null;
  layerVisibility: {
    roadNetwork: boolean;
    nodes: boolean;
    route: boolean;
    labels: boolean;
  };
  onSelectEdge: (edge: NetworkEdgeDTO | null) => void;
  onSelectNode: (node: NetworkNodeDTO | null) => void;
  isLoading?: boolean;
}

export function OSMVectorNetworkMap({
  nodes,
  edges,
  selectedEdge,
  selectedNode,
  routeResponse,
  layerVisibility,
  onSelectEdge,
  onSelectNode,
  isLoading = false,
}: OSMVectorNetworkMapProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const [isMapLoaded, setIsMapLoaded] = useState(false);

  // 1. Initialize MapLibre GL Map Instance
  useEffect(() => {
    if (!mapContainerRef.current) return;

    // Dark control-center style
    const darkStyle: maplibregl.StyleSpecification = {
      version: 8,
      sources: {
        "carto-dark": {
          type: "raster",
          tiles: [
            "https://a.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}@2x.png",
            "https://b.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}@2x.png",
            "https://c.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}@2x.png",
          ],
          tileSize: 256,
          attribution: "&copy; OpenStreetMap &copy; CARTO",
        },
      },
      layers: [
        {
          id: "carto-dark-layer",
          type: "raster",
          source: "carto-dark",
          minzoom: 0,
          maxzoom: 20,
        },
      ],
    };

    const map = new maplibregl.Map({
      container: mapContainerRef.current,
      style: darkStyle,
      center: [81.6296, 21.2514], // Default to Raipur center
      zoom: 13,
      attributionControl: false,
    });

    mapRef.current = map;

    map.on("load", () => {
      setIsMapLoaded(true);

      // Add GeoJSON Sources
      map.addSource("edges-source", {
        type: "geojson",
        data: { type: "FeatureCollection", features: [] },
      });

      map.addSource("nodes-source", {
        type: "geojson",
        data: { type: "FeatureCollection", features: [] },
      });

      map.addSource("route-source", {
        type: "geojson",
        data: { type: "FeatureCollection", features: [] },
      });

      // Add Edge Layers with Road Classification Visual Hierarchy
      map.addLayer({
        id: "edges-primary",
        type: "line",
        source: "edges-source",
        filter: ["in", ["get", "road_type"], ["literal", ["MOTORWAY", "TRUNK", "PRIMARY"]]],
        paint: {
          "line-color": "#38bdf8", // Bright Sky Blue
          "line-width": 3.5,
          "line-opacity": 0.9,
        },
      });

      map.addLayer({
        id: "edges-secondary",
        type: "line",
        source: "edges-source",
        filter: ["in", ["get", "road_type"], ["literal", ["SECONDARY", "TERTIARY"]]],
        paint: {
          "line-color": "#818cf8", // Indigo/Purple
          "line-width": 2.5,
          "line-opacity": 0.85,
        },
      });

      map.addLayer({
        id: "edges-local",
        type: "line",
        source: "edges-source",
        filter: [
          "!",
          ["in", ["get", "road_type"], ["literal", ["MOTORWAY", "TRUNK", "PRIMARY", "SECONDARY", "TERTIARY"]]],
        ],
        paint: {
          "line-color": "#475569", // Slate
          "line-width": 1.5,
          "line-opacity": 0.75,
        },
      });

      // Click target layer (wider transparent line for easy hover/clicking)
      map.addLayer({
        id: "edges-click-target",
        type: "line",
        source: "edges-source",
        paint: {
          "line-color": "#ffffff",
          "line-width": 12,
          "line-opacity": 0,
        },
      });

      // Add Nodes Layer (visible at zoom >= 13)
      map.addLayer({
        id: "nodes-layer",
        type: "circle",
        source: "nodes-source",
        minzoom: 13,
        paint: {
          "circle-color": "#0284c7",
          "circle-radius": 3.5,
          "circle-stroke-width": 1,
          "circle-stroke-color": "#ffffff",
        },
      });

      // Add Shortest Path Route Layer
      map.addLayer({
        id: "route-layer-glow",
        type: "line",
        source: "route-source",
        paint: {
          "line-color": "#f59e0b", // Amber Glow
          "line-width": 8,
          "line-opacity": 0.35,
        },
      });

      map.addLayer({
        id: "route-layer-core",
        type: "line",
        source: "route-source",
        paint: {
          "line-color": "#fbbf24", // Vibrant Amber Core
          "line-width": 4,
          "line-opacity": 0.95,
          "line-dasharray": [2, 1],
        },
      });

      // Click & Hover Event Handlers for Edges
      map.on("mouseenter", "edges-click-target", () => {
        map.getCanvas().style.cursor = "pointer";
      });

      map.on("mouseleave", "edges-click-target", () => {
        map.getCanvas().style.cursor = "";
      });

      map.on("click", "edges-click-target", (e: maplibregl.MapMouseEvent & { features?: maplibregl.MapGeoJSONFeature[] }) => {
        if (e.features && e.features.length > 0) {
          const featProps = e.features[0].properties;
          const foundEdge = edges.find((item) => item.id === featProps.id);
          if (foundEdge) {
            onSelectEdge(foundEdge);
            onSelectNode(null);
          }
        }
      });

      // Click & Hover Event Handlers for Nodes
      map.on("mouseenter", "nodes-layer", () => {
        map.getCanvas().style.cursor = "pointer";
      });

      map.on("mouseleave", "nodes-layer", () => {
        map.getCanvas().style.cursor = "";
      });

      map.on("click", "nodes-layer", (e: maplibregl.MapMouseEvent & { features?: maplibregl.MapGeoJSONFeature[] }) => {
        if (e.features && e.features.length > 0) {
          const featProps = e.features[0].properties;
          const foundNode = nodes.find((item) => item.id === featProps.id);
          if (foundNode) {
            onSelectNode(foundNode);
            onSelectEdge(null);
          }
        }
      });
    });

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);


  // 2. Update GeoJSON Sources and Auto-Fit Bounds when nodes/edges change
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !isMapLoaded) return;

    // Fast Node Lookup Map: node_id -> { lat, lng }
    const nodeMap = new Map<string, { lat: number; lng: number }>();
    nodes.forEach((n) => nodeMap.set(n.id, { lat: n.lat, lng: n.lng }));

    // Build Edges GeoJSON
    const edgeFeatures: Feature[] = [];
    let minLng = 180,
      maxLng = -180,
      minLat = 90,
      maxLat = -90;

    edges.forEach((edge) => {
      let coords: [number, number][] = [];

      if (edge.geometry && edge.geometry.coordinates) {
        coords = edge.geometry.coordinates;
      } else {
        const u = nodeMap.get(edge.from_node_id);
        const v = nodeMap.get(edge.to_node_id);
        if (u && v) {
          coords = [
            [u.lng, u.lat],
            [v.lng, v.lat],
          ];
        }
      }

      if (coords.length > 0) {
        coords.forEach(([lng, lat]) => {
          if (lng < minLng) minLng = lng;
          if (lng > maxLng) maxLng = lng;
          if (lat < minLat) minLat = lat;
          if (lat > maxLat) maxLat = lat;
        });

        edgeFeatures.push({
          type: "Feature",
          geometry: {
            type: "LineString",
            coordinates: coords,
          },
          properties: {
            id: edge.id,
            road_name: edge.road_name,
            road_type: edge.road_type ? edge.road_type.toUpperCase() : "UNCLASSIFIED",
            length_meters: edge.length_meters,
            speed_limit_kph: edge.speed_limit_kph,
            capacity_vehicles: edge.capacity_vehicles,
          },
        });
      }
    });

    const edgesGeoJSON: FeatureCollection = {
      type: "FeatureCollection",
      features: edgeFeatures,
    };

    // Build Nodes GeoJSON
    const nodeFeatures: Feature[] = nodes.map((node) => {
      if (node.lng < minLng) minLng = node.lng;
      if (node.lng > maxLng) maxLng = node.lng;
      if (node.lat < minLat) minLat = node.lat;
      if (node.lat > maxLat) maxLat = node.lat;

      return {
        type: "Feature",
        geometry: {
          type: "Point",
          coordinates: [node.lng, node.lat],
        },
        properties: {
          id: node.id,
          external_id: node.external_id,
          lat: node.lat,
          lng: node.lng,
          network_id: node.network_id,
        },
      };
    });

    const nodesGeoJSON: FeatureCollection = {
      type: "FeatureCollection",
      features: nodeFeatures,
    };

    // Update Sources in MapLibre
    const edgeSource = map.getSource("edges-source") as maplibregl.GeoJSONSource;
    if (edgeSource) edgeSource.setData(edgesGeoJSON);

    const nodeSource = map.getSource("nodes-source") as maplibregl.GeoJSONSource;
    if (nodeSource) nodeSource.setData(nodesGeoJSON);

    // Fit Bounds if valid bbox calculated
    if (minLng < maxLng && minLat < maxLat) {
      map.fitBounds(
        [
          [minLng, minLat],
          [maxLng, maxLat],
        ],
        { padding: 40, maxZoom: 16, duration: 1200 }
      );
    }
  }, [nodes, edges, isMapLoaded]);

  // 3. Update Route Path Layer Data
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !isMapLoaded) return;

    const routeSource = map.getSource("route-source") as maplibregl.GeoJSONSource;
    if (!routeSource) return;

    if (routeResponse && routeResponse.path_coordinates && routeResponse.path_coordinates.length > 1) {
      // Convert path coordinates [[lat, lng], ...] to GeoJSON [[lng, lat], ...]
      const lineCoords: [number, number][] = routeResponse.path_coordinates.map(([lat, lng]) => [lng, lat]);
      const routeGeoJSON: FeatureCollection = {
        type: "FeatureCollection",
        features: [
          {
            type: "Feature",
            geometry: {
              type: "LineString",
              coordinates: lineCoords,
            },
            properties: {
              network_id: routeResponse.network_id,
              distance_meters: routeResponse.total_distance_meters,
              travel_time_seconds: routeResponse.total_travel_time_seconds,
            },
          },
        ],
      };
      routeSource.setData(routeGeoJSON);


      // Auto fit bounds to route
      let minLng = 180,
        maxLng = -180,
        minLat = 90,
        maxLat = -90;
      lineCoords.forEach(([lng, lat]) => {
        if (lng < minLng) minLng = lng;
        if (lng > maxLng) maxLng = lng;
        if (lat < minLat) minLat = lat;
        if (lat > maxLat) maxLat = lat;
      });

      if (minLng < maxLng && minLat < maxLat) {
        map.fitBounds(
          [
            [minLng, minLat],
            [maxLng, maxLat],
          ],
          { padding: 60, maxZoom: 16, duration: 800 }
        );
      }
    } else {
      routeSource.setData({ type: "FeatureCollection", features: [] });
    }
  }, [routeResponse, isMapLoaded]);

  // 4. Update Layer Visibilities
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !isMapLoaded) return;

    const vis = layerVisibility.roadNetwork ? "visible" : "none";
    ["edges-primary", "edges-secondary", "edges-local", "edges-click-target"].forEach((layerId) => {
      if (map.getLayer(layerId)) map.setLayoutProperty(layerId, "visibility", vis);
    });

    if (map.getLayer("nodes-layer")) {
      map.setLayoutProperty("nodes-layer", "visibility", layerVisibility.nodes ? "visible" : "none");
    }

    const routeVis = layerVisibility.route ? "visible" : "none";
    ["route-layer-glow", "route-layer-core"].forEach((layerId) => {
      if (map.getLayer(layerId)) map.setLayoutProperty(layerId, "visibility", routeVis);
    });
  }, [layerVisibility, isMapLoaded]);

  // Map Controls Helpers
  const handleZoomIn = () => mapRef.current?.zoomIn();
  const handleZoomOut = () => mapRef.current?.zoomOut();
  const handleFitNetwork = () => {
    const map = mapRef.current;
    if (!map || nodes.length === 0) return;
    let minLng = 180,
      maxLng = -180,
      minLat = 90,
      maxLat = -90;
    nodes.forEach((n) => {
      if (n.lng < minLng) minLng = n.lng;
      if (n.lng > maxLng) maxLng = n.lng;
      if (n.lat < minLat) minLat = n.lat;
      if (n.lat > maxLat) maxLat = n.lat;
    });
    if (minLng < maxLng && minLat < maxLat) {
      map.fitBounds(
        [
          [minLng, minLat],
          [maxLng, maxLat],
        ],
        { padding: 40, maxZoom: 16, duration: 800 }
      );
    }
  };

  return (
    <div className="relative w-full h-full min-h-[520px] bg-[#07090c] border border-slate-800 rounded-none overflow-hidden select-none font-sans">
      {/* Map Canvas Container */}
      <div ref={mapContainerRef} className="w-full h-full min-h-[520px]" />

      {/* Loading Overlay */}
      {isLoading && (
        <div className="absolute inset-0 bg-[#090b0e]/80 backdrop-blur-sm z-20 flex flex-col items-center justify-center space-y-3 font-mono text-xs text-sky-400">
          <Activity size={24} className="animate-spin text-sky-400" />
          <span>Loading OpenStreetMap transportation graph...</span>
        </div>
      )}

      {/* On-Map Floating Control Buttons */}
      <div className="absolute top-4 right-4 z-10 flex flex-col space-y-1.5 font-mono">
        <button
          onClick={handleZoomIn}
          title="Zoom In"
          className="w-8 h-8 bg-[#0d1015]/90 hover:bg-slate-800 border border-slate-700 text-slate-200 flex items-center justify-center transition-all shadow-md"
        >
          <ZoomIn size={14} />
        </button>
        <button
          onClick={handleZoomOut}
          title="Zoom Out"
          className="w-8 h-8 bg-[#0d1015]/90 hover:bg-slate-800 border border-slate-700 text-slate-200 flex items-center justify-center transition-all shadow-md"
        >
          <ZoomOut size={14} />
        </button>
        <button
          onClick={handleFitNetwork}
          title="Fit Complete Network Bounds"
          className="w-8 h-8 bg-[#0d1015]/90 hover:bg-slate-800 border border-slate-700 text-sky-400 flex items-center justify-center transition-all shadow-md"
        >
          <Maximize2 size={14} />
        </button>
      </div>
    </div>
  );
}
