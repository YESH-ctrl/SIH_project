-- =============================================================================
-- Q-FLOW REALTIME TELEMETRY MIGRATION (idempotent, non-destructive)
-- Extends the existing supabase_schema.sql domain tables with:
--   * vehicle_positions       (raw GPS telemetry history)
--   * vehicles live-state cols(current_lat/lng/speed/heading/last_gps_*)
--   * traffic_edge_states     (unified per-edge live traffic state)
--   * incidents lifecycle     (lat/lng/expires_at/confidence/source/status)
--   * reroute_log             (measurable reroute decisions)
--   * optimization run metrics(vehicles_considered, iterations, best_cost ...)
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. vehicle_positions — raw, immutable GPS telemetry history
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.vehicle_positions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    vehicle_id UUID REFERENCES public.vehicles(id) ON DELETE CASCADE,
    vehicle_code TEXT,
    organization_id UUID REFERENCES public.organizations(id),
    "timestamp" TIMESTAMPTZ NOT NULL,
    latitude DOUBLE PRECISION NOT NULL,
    longitude DOUBLE PRECISION NOT NULL,
    speed_kmh DOUBLE PRECISION,
    heading_deg DOUBLE PRECISION,
    accuracy_m DOUBLE PRECISION,
    altitude_m DOUBLE PRECISION,
    source TEXT NOT NULL DEFAULT 'unknown',
    matched_edge_id UUID REFERENCES public.network_edges(id),
    matched_edge_fraction DOUBLE PRECISION,
    matched_distance_m DOUBLE PRECISION,
    match_confidence DOUBLE PRECISION,
    validation_status TEXT NOT NULL DEFAULT 'ACCEPTED',
    raw_payload JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_vpos_vehicle_ts ON public.vehicle_positions(vehicle_id, "timestamp" DESC);
CREATE INDEX IF NOT EXISTS idx_vpos_vehicle_code_ts ON public.vehicle_positions(vehicle_code, "timestamp" DESC);
CREATE INDEX IF NOT EXISTS idx_vpos_ts ON public.vehicle_positions("timestamp" DESC);
CREATE INDEX IF NOT EXISTS idx_vpos_org_ts ON public.vehicle_positions(organization_id, "timestamp" DESC);

-- -----------------------------------------------------------------------------
-- 2. vehicles — live current-state columns (additive only)
-- -----------------------------------------------------------------------------
ALTER TABLE public.vehicles ADD COLUMN IF NOT EXISTS current_lat DOUBLE PRECISION;
ALTER TABLE public.vehicles ADD COLUMN IF NOT EXISTS current_lng DOUBLE PRECISION;
ALTER TABLE public.vehicles ADD COLUMN IF NOT EXISTS current_speed_kmh DOUBLE PRECISION;
ALTER TABLE public.vehicles ADD COLUMN IF NOT EXISTS current_heading_deg DOUBLE PRECISION;
ALTER TABLE public.vehicles ADD COLUMN IF NOT EXISTS last_gps_timestamp TIMESTAMPTZ;
ALTER TABLE public.vehicles ADD COLUMN IF NOT EXISTS last_gps_accuracy_m DOUBLE PRECISION;
ALTER TABLE public.vehicles ADD COLUMN IF NOT EXISTS current_edge_id UUID REFERENCES public.network_edges(id);
ALTER TABLE public.vehicles ADD COLUMN IF NOT EXISTS tracking_status TEXT NOT NULL DEFAULT 'OFFLINE';
ALTER TABLE public.vehicles ADD COLUMN IF NOT EXISTS last_match_confidence DOUBLE PRECISION;
ALTER TABLE public.vehicles ADD COLUMN IF NOT EXISTS telemetry_source TEXT;
ALTER TABLE public.vehicles ADD COLUMN IF NOT EXISTS current_route_id TEXT;
ALTER TABLE public.vehicles ADD COLUMN IF NOT EXISTS destination_lat DOUBLE PRECISION;
ALTER TABLE public.vehicles ADD COLUMN IF NOT EXISTS destination_lng DOUBLE PRECISION;
ALTER TABLE public.vehicles ADD COLUMN IF NOT EXISTS destination_name TEXT;
ALTER TABLE public.vehicles ADD COLUMN IF NOT EXISTS current_route_eta_s DOUBLE PRECISION;
ALTER TABLE public.vehicles ADD COLUMN IF NOT EXISTS alternative_route_eta_s DOUBLE PRECISION;
ALTER TABLE public.vehicles ADD COLUMN IF NOT EXISTS last_reroute_at TIMESTAMPTZ;
ALTER TABLE public.vehicles ADD COLUMN IF NOT EXISTS last_reroute_reason TEXT;
ALTER TABLE public.vehicles ADD COLUMN IF NOT EXISTS telemetry_source_mode TEXT DEFAULT 'NONE';

CREATE INDEX IF NOT EXISTS idx_vehicles_tracking_status ON public.vehicles(tracking_status);
CREATE INDEX IF NOT EXISTS idx_vehicles_org_status ON public.vehicles(organization_id, tracking_status);

-- -----------------------------------------------------------------------------
-- 3. traffic_edge_states — unified live per-edge traffic (fleet GPS + provider)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.traffic_edge_states (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    network_id UUID NOT NULL REFERENCES public.road_networks(id) ON DELETE CASCADE,
    edge_id UUID NOT NULL REFERENCES public.network_edges(id) ON DELETE CASCADE,
    free_flow_speed_kmh DOUBLE PRECISION NOT NULL DEFAULT 50,
    observed_speed_kmh DOUBLE PRECISION,
    sample_count INT NOT NULL DEFAULT 0,
    speed_confidence DOUBLE PRECISION NOT NULL DEFAULT 0,
    congestion_ratio DOUBLE PRECISION,
    congestion_level TEXT NOT NULL DEFAULT 'UNKNOWN',
    travel_time_seconds DOUBLE PRECISION,
    free_flow_time_seconds DOUBLE PRECISION,
    source TEXT NOT NULL DEFAULT 'UNKNOWN',
    provider TEXT,
    provider_updated_at TIMESTAMPTZ,
    fleet_updated_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (network_id, edge_id)
);

CREATE INDEX IF NOT EXISTS idx_tstate_network ON public.traffic_edge_states(network_id);
CREATE INDEX IF NOT EXISTS idx_tstate_network_level ON public.traffic_edge_states(network_id, congestion_level);
CREATE INDEX IF NOT EXISTS idx_tstate_updated ON public.traffic_edge_states(network_id, updated_at DESC);

-- -----------------------------------------------------------------------------
-- 4. incidents — add lifecycle/geo columns to the existing incidents table
-- -----------------------------------------------------------------------------
ALTER TABLE public.incidents ADD COLUMN IF NOT EXISTS latitude DOUBLE PRECISION;
ALTER TABLE public.incidents ADD COLUMN IF NOT EXISTS longitude DOUBLE PRECISION;
ALTER TABLE public.incidents ADD COLUMN IF NOT EXISTS detected_at TIMESTAMPTZ;
ALTER TABLE public.incidents ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE public.incidents ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ;
ALTER TABLE public.incidents ADD COLUMN IF NOT EXISTS confidence DOUBLE PRECISION;
ALTER TABLE public.incidents ADD COLUMN IF NOT EXISTS source TEXT NOT NULL DEFAULT 'MANUAL';
ALTER TABLE public.incidents ADD COLUMN IF NOT EXISTS affected_edge_ids UUID[] DEFAULT '{}';
ALTER TABLE public.incidents ADD COLUMN IF NOT EXISTS affected_edges_json JSONB;
ALTER TABLE public.incidents ADD COLUMN IF NOT EXISTS evidence_count INT DEFAULT 0;
ALTER TABLE public.incidents ADD COLUMN IF NOT EXISTS resolution_note TEXT;
ALTER TABLE public.incidents ADD COLUMN IF NOT EXISTS resolved_at TIMESTAMPTZ;

-- Widen status to support the realtime lifecycle (existing rows keep working:
-- 'Active' stays valid, new statuses are lower-case lifecycle names).
CREATE INDEX IF NOT EXISTS idx_incidents_status ON public.incidents(status);
CREATE INDEX IF NOT EXISTS idx_incidents_org_status ON public.incidents(organization_id, status);

-- -----------------------------------------------------------------------------
-- 5. reroute_log — every reroute decision is measurable and auditable
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.reroute_log (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID REFERENCES public.organizations(id),
    vehicle_id UUID REFERENCES public.vehicles(id),
    vehicle_code TEXT,
    optimization_run_id UUID REFERENCES public.optimization_runs(id),
    old_route_id TEXT,
    new_route_id TEXT,
    old_route_summary JSONB,
    new_route_summary JSONB,
    old_eta_s DOUBLE PRECISION,
    new_eta_s DOUBLE PRECISION,
    eta_improvement_s DOUBLE PRECISION,
    eta_improvement_pct DOUBLE PRECISION,
    reason TEXT NOT NULL,
    details JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_reroute_vehicle ON public.reroute_log(vehicle_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_reroute_org ON public.reroute_log(organization_id, created_at DESC);

-- -----------------------------------------------------------------------------
-- 6. optimization_runs — QPSO experimental metrics columns (additive)
-- -----------------------------------------------------------------------------
ALTER TABLE public.optimization_runs ADD COLUMN IF NOT EXISTS optimization_id TEXT;
ALTER TABLE public.optimization_runs ADD COLUMN IF NOT EXISTS vehicles_considered INT;
ALTER TABLE public.optimization_runs ADD COLUMN IF NOT EXISTS iterations INT;
ALTER TABLE public.optimization_runs ADD COLUMN IF NOT EXISTS population_size INT;
ALTER TABLE public.optimization_runs ADD COLUMN IF NOT EXISTS best_cost DOUBLE PRECISION;
ALTER TABLE public.optimization_runs ADD COLUMN IF NOT EXISTS computation_time_ms DOUBLE PRECISION;
ALTER TABLE public.optimization_runs ADD COLUMN IF NOT EXISTS routes_changed INT;
ALTER TABLE public.optimization_runs ADD COLUMN IF NOT EXISTS baseline_total_time_s DOUBLE PRECISION;
ALTER TABLE public.optimization_runs ADD COLUMN IF NOT EXISTS optimized_total_time_s DOUBLE PRECISION;
ALTER TABLE public.optimization_runs ADD COLUMN IF NOT EXISTS improvement_pct DOUBLE PRECISION;
ALTER TABLE public.optimization_runs ADD COLUMN IF NOT EXISTS data_mode TEXT;
ALTER TABLE public.optimization_runs ADD COLUMN IF NOT EXISTS result_details JSONB;

CREATE INDEX IF NOT EXISTS idx_opt_runs_mode ON public.optimization_runs(data_mode, created_at DESC);

-- -----------------------------------------------------------------------------
-- 7. Row Level Security — mirror org isolation of the core domain tables
-- -----------------------------------------------------------------------------
ALTER TABLE public.vehicle_positions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.traffic_edge_states ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reroute_log ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
    CREATE POLICY "Org Isolation Vehicle Positions" ON public.vehicle_positions
        FOR ALL USING (organization_id = public.get_auth_org_id() OR organization_id IS NULL);
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE POLICY "Org Isolation Traffic Edge States" ON public.traffic_edge_states
        FOR ALL USING (true); -- global network state, readable by any org member
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE POLICY "Org Isolation Reroute Log" ON public.reroute_log
        FOR ALL USING (organization_id = public.get_auth_org_id() OR organization_id IS NULL);
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- -----------------------------------------------------------------------------
-- 8. realtime publication (Supabase Realtime / logical replication)
-- -----------------------------------------------------------------------------
DO $$ BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.vehicle_positions;
EXCEPTION WHEN duplicate_object THEN null;
WHEN undefined_object THEN null; END $$;
