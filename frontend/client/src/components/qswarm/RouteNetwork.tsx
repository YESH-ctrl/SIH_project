// QSwarm style reminder: route traces are evidence. Use thin technical lines, semantic traffic colors, and restrained lime pulses instead of decorative glow.

import { routePaths, zones } from "@/data/demo";
import { raipurRoutePaths } from "@/data/raipurRoutes";

type RouteNetworkProps = {
  compact?: boolean;
  incident?: boolean;
  optimized?: boolean;
  highlightedZone?: string;
  vehicleCount?: number;
  running?: boolean;
  useRaipurRoutes?: boolean;
  selectedRoute?: number;
};

const nodePoints = [
  [12, 73], [19, 8], [22, 42], [33, 19], [40, 39], [48, 45], [62, 36], [79, 31], [86, 77], [91, 12], [57, 74], [30, 78], [73, 61], [47, 17], [13, 33], [68, 54],
];

export function RouteNetwork({ compact = false, incident = false, optimized = true, highlightedZone, vehicleCount, running = true, useRaipurRoutes = false, selectedRoute = -1 }: RouteNetworkProps) {
  const activePaths = useRaipurRoutes ? raipurRoutePaths : routePaths;
  return (
    <svg className={`route-network ${compact ? "route-network--compact" : ""}`} viewBox="0 0 100 100" preserveAspectRatio="none" role="img" aria-label="Animated simulated urban road network">
      <defs>
        <pattern id="q-grid" width="8" height="8" patternUnits="userSpaceOnUse">
          <path d="M 8 0 L 0 0 0 8" fill="none" stroke="rgba(244,244,240,.09)" strokeWidth=".18" />
        </pattern>
        <filter id="q-soft-glow" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="1.2" result="blur" />
          <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
      </defs>
      <rect width="100" height="100" fill="url(#q-grid)" />
      {zones.map((zone) => (
        <rect key={zone.id} x={zone.x} y={zone.y} width={zone.width} height={zone.height} className={`network-zone ${highlightedZone === zone.id ? "is-highlighted" : ""} ${incident && zone.id === "EAST" ? "is-incident" : ""}`} />
      ))}
      {activePaths.map((path, index) => (
        <path key={`road-${index}`} d={path} className="network-road" pathLength="1" />
      ))}
      {activePaths.map((path, index) => (
        <path key={`route-${index}`} d={path} className={`network-route network-route--${index + 1} ${optimized ? "is-optimized" : ""} ${running ? "is-running" : "is-paused"} ${selectedRoute === index ? "is-focus" : selectedRoute !== -1 ? "is-dimmed" : ""}`} pathLength="1" />
      ))}
      {nodePoints.map(([cx, cy], index) => (
        <g key={`node-${index}`} className="network-node">
          <circle cx={cx} cy={cy} r={index % 4 === 0 ? 1.05 : .62} />
          {index % 4 === 0 && <circle cx={cx} cy={cy} r="2.7" className="network-node__pulse" />}
        </g>
      ))}
      <g className="network-depots">
        <path d="M 12 72 l 2 -3 2 3 -2 3 z" />
        <path d="M 86 77 l 2 -3 2 3 -2 3 z" />
        <path d="M 78 18 l 2 -3 2 3 -2 3 z" />
      </g>
      <g className="network-vehicles">
        {Array.from({ length: vehicleCount ?? (compact ? 12 : 24) }).map((_, index) => {
          const path = activePaths[index % activePaths.length];
          return <circle key={`vehicle-${index}`} cx="0" cy="0" r={index % 7 === 0 ? 1.05 : .62} className={index % 7 === 0 ? "vehicle vehicle--bus" : "vehicle"} filter={index % 7 === 0 ? "url(#q-soft-glow)" : undefined} style={{ offsetPath: `path('${path}')`, animationDelay: `${-index * .45}s`, animationDuration: `${7 + (index % 6)}s`, animationPlayState: running ? "running" : "paused" }} />;
        })}
      </g>
      {incident && <g className="incident-marker" transform="translate(76 36)"><circle r="4.8" /><path d="M 0 -2.2 L 0 1.1 M 0 2.6 L 0 2.7" /></g>}
    </svg>
  );
}
