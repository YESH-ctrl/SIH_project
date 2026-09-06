import React, { useState } from "react";
import { QFlowDataStore, Vehicle, TrafficSegment, TrafficIncident } from "@/data/qflowData";
import { Layers, MapPin, Truck, AlertTriangle, Activity, Eye, SlidersHorizontal } from "lucide-react";

interface MapProps {
  selectedVehicle?: Vehicle | null;
  onSelectVehicle?: (vehicle: Vehicle) => void;
  onSelectRoad?: (road: TrafficSegment) => void;
  onSelectIncident?: (incident: TrafficIncident) => void;
  highlightAffectedRoutes?: boolean;
  reroutedVehicleId?: string | null;
}

export function LiveOperationsMap({
  selectedVehicle,
  onSelectVehicle,
  onSelectRoad,
  onSelectIncident,
  highlightAffectedRoutes = false,
  reroutedVehicleId,
}: MapProps) {
  // Layer visibility toggles
  const [layers, setLayers] = useState({
    traffic: true,
    vehicles: true,
    routes: true,
    deliveries: true,
    depots: true,
    incidents: true,
    zones: true,
  });

  const toggleLayer = (layer: keyof typeof layers) => {
    setLayers((prev) => ({ ...prev, [layer]: !prev[layer] }));
  };

  // Convert lat/lng to SVG map canvas space (width 800, height 500)
  // Lat range: ~21.21 to 21.29 -> Y (500 to 0)
  // Lng range: ~81.60 to 81.67 -> X (0 to 800)
  const mapX = (lng: number) => ((lng - 81.60) / 0.07) * 760 + 20;
  const mapY = (lat: number) => 480 - ((lat - 21.21) / 0.08) * 460;

  return (
    <div className="relative w-full h-full bg-[#090b0e] border border-slate-800 rounded-none overflow-hidden select-none font-sans text-white">
      {/* Map Header Overlay Bar */}
      <div className="absolute top-3 left-3 right-3 z-10 flex flex-wrap items-center justify-between gap-2 p-2 bg-[#0d1015]/90 border border-slate-800 backdrop-blur text-xs font-mono">
        <div className="flex items-center space-x-2">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span className="font-bold uppercase tracking-wider text-slate-200">
            RAJPUR URBAN OPERATIONAL NETWORK
          </span>
          <span className="text-[10px] text-slate-500 hidden sm:inline">| 21.2514° N, 81.6296° E</span>
        </div>

        {/* Layer Toggles */}
        <div className="flex items-center space-x-1">
          <span className="text-[10px] text-slate-500 uppercase mr-1 flex items-center">
            <Layers size={11} className="mr-1" /> LAYERS:
          </span>
          {(Object.keys(layers) as (keyof typeof layers)[]).map((key) => (
            <button
              key={key}
              onClick={() => toggleLayer(key)}
              className={`px-2 py-0.5 text-[10px] uppercase font-mono border transition-all ${
                layers[key]
                  ? "bg-slate-800 text-emerald-400 border-slate-700 font-semibold"
                  : "bg-slate-900/60 text-slate-500 border-slate-800/80"
              }`}
            >
              {key}
            </button>
          ))}
        </div>
      </div>

      {/* SVG Operational Map Surface */}
      <svg className="w-full h-full min-h-[420px]" viewBox="0 0 800 500" preserveAspectRatio="xMidYMid slice">
        {/* Background Grid Lines */}
        <defs>
          <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
            <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#1e293b" strokeWidth="0.5" strokeDasharray="2,2" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#grid)" />

        {/* Zone Boundaries Overlay */}
        {layers.zones && (
          <g className="zones opacity-30">
            <rect x="20" y="20" width="370" height="230" fill="#3b82f6" fillOpacity="0.04" stroke="#3b82f6" strokeWidth="1" strokeDasharray="4,4" />
            <text x="35" y="40" fill="#3b82f6" fontSize="10" fontFamily="monospace" fontWeight="bold">ZONE 1 (NORTH)</text>

            <rect x="400" y="20" width="380" height="230" fill="#10b981" fillOpacity="0.04" stroke="#10b981" strokeWidth="1" strokeDasharray="4,4" />
            <text x="415" y="40" fill="#10b981" fontSize="10" fontFamily="monospace" fontWeight="bold">ZONE 2 (EAST)</text>

            <rect x="20" y="260" width="370" height="220" fill="#f59e0b" fillOpacity="0.04" stroke="#f59e0b" strokeWidth="1" strokeDasharray="4,4" />
            <text x="35" y="280" fill="#f59e0b" fontSize="10" fontFamily="monospace" fontWeight="bold">ZONE 3 (SOUTH)</text>

            <rect x="400" y="260" width="380" height="220" fill="#8b5cf6" fillOpacity="0.04" stroke="#8b5cf6" strokeWidth="1" strokeDasharray="4,4" />
            <text x="415" y="280" fill="#8b5cf6" fontSize="10" fontFamily="monospace" fontWeight="bold">ZONE 4 (WEST)</text>
          </g>
        )}

        {/* Traffic Road Network Lines */}
        {layers.traffic &&
          QFlowDataStore.trafficSegments.map((segment) => {
            const points = segment.coordinates.map((c) => `${mapX(c[1])},${mapY(c[0])}`).join(" ");
            const isSevere = segment.congestionLevel === "Severe";
            const isModerate = segment.congestionLevel === "Moderate";
            const color = isSevere ? "#ef4444" : isModerate ? "#f59e0b" : "#10b981";

            return (
              <g key={segment.id} className="cursor-pointer group" onClick={() => onSelectRoad && onSelectRoad(segment)}>
                {/* Thick glow line */}
                <polyline
                  points={points}
                  fill="none"
                  stroke={color}
                  strokeWidth={isSevere ? "7" : "5"}
                  strokeOpacity={isSevere ? "0.35" : "0.2"}
                />
                {/* Core road line */}
                <polyline
                  points={points}
                  fill="none"
                  stroke={color}
                  strokeWidth={isSevere ? "3.5" : "2.5"}
                  strokeDasharray={isSevere ? "6,3" : undefined}
                />
                {/* Click target label */}
                <title>{`${segment.roadName}: ${segment.congestionLevel} Congestion (${segment.currentSpeedKmh} km/h)`}</title>
              </g>
            );
          })}

        {/* Optimized Route Overlays */}
        {layers.routes && (
          <g className="routes">
            {/* Primary Fleet Highway Trace */}
            <polyline
              points="140,120 280,180 440,220 560,190 680,260"
              fill="none"
              stroke="#38bdf8"
              strokeWidth="2"
              strokeDasharray="4,2"
              strokeOpacity="0.7"
            />
            {highlightAffectedRoutes && (
              <polyline
                points="440,220 490,260 540,320 620,380"
                fill="none"
                stroke="#10b981"
                strokeWidth="3.5"
                strokeDasharray="6,3"
                className="animate-pulse"
              >
                <title>Re-optimized Bypass Route around E17</title>
              </polyline>
            )}
          </g>
        )}

        {/* Delivery Points */}
        {layers.deliveries &&
          Array.from({ length: 25 }, (_, i) => {
            const x = 60 + ((i * 31) % 700);
            const y = 50 + ((i * 47) % 400);
            return (
              <circle
                key={`del-${i}`}
                cx={x}
                cy={y}
                r="3"
                fill="#64748b"
                fillOpacity="0.7"
                stroke="#090b0e"
                strokeWidth="1"
              >
                <title>{`Delivery Stop C-${100 + i}`}</title>
              </circle>
            );
          })}

        {/* Depots */}
        {layers.depots &&
          QFlowDataStore.depots.map((depot) => {
            const x = mapX(depot.lng);
            const y = mapY(depot.lat);
            return (
              <g key={depot.id} transform={`translate(${x}, ${y})`}>
                <rect x="-8" y="-8" width="16" height="16" fill="#3b82f6" stroke="#ffffff" strokeWidth="1.5" />
                <text x="12" y="4" fill="#ffffff" fontSize="9" fontFamily="monospace" fontWeight="bold">
                  {depot.name.split(" ")[0]}
                </text>
              </g>
            );
          })}

        {/* Traffic Incidents */}
        {layers.incidents &&
          QFlowDataStore.incidents.map((incident) => {
            const x = mapX(incident.lng);
            const y = mapY(incident.lat);
            return (
              <g
                key={incident.id}
                transform={`translate(${x}, ${y})`}
                className="cursor-pointer group"
                onClick={() => onSelectIncident && onSelectIncident(incident)}
              >
                <circle r="16" fill="#ef4444" fillOpacity="0.25" className="animate-ping" />
                <polygon points="0,-10 10,8 -10,8" fill="#ef4444" stroke="#ffffff" strokeWidth="1.5" />
                <text x="12" y="4" fill="#ef4444" fontSize="10" fontFamily="monospace" fontWeight="bold">
                  🚨 {incident.roadName} (+78% Delay)
                </text>
              </g>
            );
          })}

        {/* Vehicle Markers */}
        {layers.vehicles &&
          QFlowDataStore.vehicles.map((vehicle) => {
            const x = mapX(vehicle.lng);
            const y = mapY(vehicle.lat);
            const isSelected = selectedVehicle?.id === vehicle.id;
            const isRerouted = reroutedVehicleId === vehicle.id;
            const isAffected = vehicle.status === "Affected";

            const fill = isRerouted
              ? "#10b981"
              : isAffected
              ? "#ef4444"
              : vehicle.status === "Delayed"
              ? "#f59e0b"
              : "#0284c7";

            return (
              <g
                key={vehicle.id}
                transform={`translate(${x}, ${y})`}
                className="cursor-pointer group"
                onClick={() => onSelectVehicle && onSelectVehicle(vehicle)}
              >
                {isSelected && <circle r="14" fill="none" stroke="#ffffff" strokeWidth="2" strokeDasharray="3,3" />}
                <circle r={isSelected ? "6" : "4.5"} fill={fill} stroke="#ffffff" strokeWidth="1.2" />
                
                {/* Vehicle Label on hover or selection */}
                {(isSelected || isRerouted || isAffected) && (
                  <text
                    x="8"
                    y="3"
                    fill={isRerouted ? "#10b981" : isAffected ? "#ef4444" : "#ffffff"}
                    fontSize="9"
                    fontFamily="monospace"
                    fontWeight="bold"
                    className="drop-shadow-md"
                  >
                    {vehicle.id}
                  </text>
                )}
              </g>
            );
          })}
      </svg>

      {/* Map Legend Overlay */}
      <div className="absolute bottom-3 left-3 p-2.5 bg-[#0d1015]/90 border border-slate-800 backdrop-blur text-[10px] font-mono space-y-1">
        <div className="text-slate-400 font-bold uppercase mb-1">NETWORK LEGEND</div>
        <div className="flex items-center space-x-3 text-slate-300">
          <span className="flex items-center"><span className="w-2.5 h-2.5 rounded-full bg-emerald-500 mr-1" /> Active Fleet</span>
          <span className="flex items-center"><span className="w-2.5 h-2.5 rounded-full bg-amber-500 mr-1" /> Delayed</span>
          <span className="flex items-center"><span className="w-2.5 h-2.5 rounded-full bg-red-500 mr-1" /> Affected / Incident</span>
          <span className="flex items-center"><span className="w-2.5 h-2.5 bg-blue-500 mr-1" /> Depot</span>
        </div>
      </div>
    </div>
  );
}
