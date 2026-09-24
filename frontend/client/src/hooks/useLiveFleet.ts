// ─── useLiveFleet — React binding for the live realtime store ────────────────
import { useCallback, useEffect, useRef, useState } from "react";
import {
  liveStore,
  type LiveVehicle,
  type TrafficEdgeState,
  type LiveIncident,
  type VehicleRoute,
  type DataMode,
  type SourceFreshness,
} from "@/services/liveStore";

export interface LiveFleetState {
  dataMode: DataMode;
  vehicles: LiveVehicle[];
  trafficEdges: TrafficEdgeState[];
  incidents: LiveIncident[];
  routes: Record<string, VehicleRoute>;
  trackingCounts: Record<string, number>;
  realtimeConnected: boolean;
  freshness: SourceFreshness;
  error: string | null;
  loading: boolean;
  lastEventAt: number;
}

export function useLiveFleet(): LiveFleetState {
  const [state, setState] = useState<LiveFleetState>({
    dataMode: liveStore.snapshot.data_mode,
    vehicles: liveStore.snapshot.vehicles,
    trafficEdges: liveStore.snapshot.trafficEdges,
    incidents: liveStore.snapshot.incidents,
    routes: liveStore.snapshot.routes,
    trackingCounts: liveStore.snapshot.tracking_counts,
    realtimeConnected: liveStore.realtimeConnected,
    freshness: liveStore.freshness(),
    error: null,
    loading: true,
    lastEventAt: 0,
  });
  const mountedRef = useRef(true);

  const refresh = useCallback(async () => {
    try {
      await liveStore.refresh();
      if (mountedRef.current) {
        setState((s) => ({
          ...s,
          dataMode: liveStore.snapshot.data_mode,
          vehicles: liveStore.snapshot.vehicles,
          trafficEdges: liveStore.snapshot.trafficEdges,
          incidents: liveStore.snapshot.incidents,
          routes: liveStore.snapshot.routes,
          trackingCounts: liveStore.snapshot.tracking_counts,
          loading: false,
          error: null,
        }));
      }
    } catch (e: any) {
      if (mountedRef.current) {
        setState((s) => ({
          ...s,
          loading: false,
          error:
            e?.message?.includes("Failed to fetch") || e?.code === "ERR_NETWORK"
              ? "BACKEND UNREACHABLE — NO LIVE VEHICLE DATA"
              : e?.message || "Snapshot failed",
        }));
      }
    }
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    refresh();
    liveStore.connectWebSocket();

    const unsubscribe = liveStore.subscribe(() => {
      if (!mountedRef.current) return;
      setState((s) => ({
        ...s,
        vehicles: liveStore.snapshot.vehicles,
        trafficEdges: liveStore.snapshot.trafficEdges,
        incidents: liveStore.snapshot.incidents,
        routes: liveStore.snapshot.routes,
        lastEventAt: Date.now(),
      }));
    });

    const unsubStatus = liveStore.subscribeStatus((st) => {
      if (!mountedRef.current) return;
      setState((s) => ({
        ...s,
        realtimeConnected: st.realtimeConnected,
        dataMode: st.dataMode,
        freshness: liveStore.freshness(),
      }));
    });

    // periodic freshness recompute (drives "X sec ago" labels)
    const freshnessTimer = window.setInterval(() => {
      if (mountedRef.current) {
        setState((s) => ({ ...s, freshness: liveStore.freshness() }));
      }
    }, 5000);

    return () => {
      mountedRef.current = false;
      unsubscribe();
      unsubStatus();
      clearInterval(freshnessTimer);
      // keep the websocket alive across pages; disconnected on app unmount
    };
  }, [refresh]);

  return state;
}
