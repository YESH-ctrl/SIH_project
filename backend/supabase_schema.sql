-- =============================================================================
-- Q-FLOW FLEET INTELLIGENCE — COMPREHENSIVE PRODUCTION SUPABASE SCHEMA
-- Non-Destructive, Idempotent Database Reconciliation & RLS Security Migration
-- =============================================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- -----------------------------------------------------------------------------
-- 1. ORGANIZATIONS TABLE
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.organizations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    logo_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.organizations ADD COLUMN IF NOT EXISTS logo_url TEXT;
ALTER TABLE public.organizations ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE public.organizations ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- Seed default organization for initial demo
INSERT INTO public.organizations (id, name)
VALUES ('00000000-0000-0000-0000-000000000001', 'SIH 2026 Fleet Operations')
ON CONFLICT (id) DO NOTHING;

-- -----------------------------------------------------------------------------
-- 2. CONTROLLED ROLES ENUM
-- -----------------------------------------------------------------------------
DO $$ BEGIN
    CREATE TYPE public.app_role AS ENUM (
        'SUPER_ADMIN',
        'ORG_ADMIN',
        'OPERATIONS_MANAGER',
        'DISPATCHER',
        'ANALYST',
        'DRIVER'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- -----------------------------------------------------------------------------
-- 3. PROFILES TABLE (Linked to auth.users)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    auth_user_id UUID UNIQUE NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    full_name TEXT NOT NULL,
    email TEXT NOT NULL,
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE RESTRICT,
    role public.app_role NOT NULL DEFAULT 'DISPATCHER',
    avatar_url TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS avatar_url TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- Index for RLS lookups
CREATE INDEX IF NOT EXISTS idx_profiles_auth_user_id ON public.profiles(auth_user_id);
CREATE INDEX IF NOT EXISTS idx_profiles_organization_id ON public.profiles(organization_id);

-- -----------------------------------------------------------------------------
-- 4. RLS HELPER FUNCTIONS
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_auth_org_id()
RETURNS UUID
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT organization_id FROM public.profiles WHERE auth_user_id = auth.uid() LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.get_auth_role()
RETURNS public.app_role
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role FROM public.profiles WHERE auth_user_id = auth.uid() LIMIT 1;
$$;

-- -----------------------------------------------------------------------------
-- 5. AUTOMATIC TRIGGER FOR NEW USER REGISTRATION
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    default_org_id UUID;
    user_role public.app_role;
BEGIN
    SELECT id INTO default_org_id FROM public.organizations LIMIT 1;
    
    user_role := COALESCE(
        (new.raw_user_meta_data->>'role')::public.app_role,
        'DISPATCHER'::public.app_role
    );

    INSERT INTO public.profiles (
        auth_user_id,
        full_name,
        email,
        organization_id,
        role
    ) VALUES (
        new.id,
        COALESCE(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
        new.email,
        default_org_id,
        user_role
    )
    ON CONFLICT (auth_user_id) DO NOTHING;

    RETURN new;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- -----------------------------------------------------------------------------
-- 6. APPLICATION DOMAIN TABLES WITH ORGANIZATION_ID
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.vehicles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id),
    vehicle_code TEXT NOT NULL,
    name TEXT NOT NULL,
    type TEXT NOT NULL,
    capacity_kg NUMERIC NOT NULL,
    current_load_kg NUMERIC DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'Active',
    current_location TEXT,
    next_stop TEXT,
    eta TEXT,
    route_id TEXT,
    lat NUMERIC,
    lng NUMERIC,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.vehicles ADD COLUMN IF NOT EXISTS current_load_kg NUMERIC DEFAULT 0;
ALTER TABLE public.vehicles ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'Active';
ALTER TABLE public.vehicles ADD COLUMN IF NOT EXISTS current_location TEXT;
ALTER TABLE public.vehicles ADD COLUMN IF NOT EXISTS next_stop TEXT;
ALTER TABLE public.vehicles ADD COLUMN IF NOT EXISTS eta TEXT;
ALTER TABLE public.vehicles ADD COLUMN IF NOT EXISTS route_id TEXT;
ALTER TABLE public.vehicles ADD COLUMN IF NOT EXISTS lat NUMERIC;
ALTER TABLE public.vehicles ADD COLUMN IF NOT EXISTS lng NUMERIC;

CREATE TABLE IF NOT EXISTS public.customers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id),
    customer_code TEXT NOT NULL,
    name TEXT NOT NULL,
    demand_kg NUMERIC NOT NULL,
    time_window TEXT,
    priority TEXT DEFAULT 'Standard',
    lat NUMERIC NOT NULL,
    lng NUMERIC NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS time_window TEXT;
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS priority TEXT DEFAULT 'Standard';

CREATE TABLE IF NOT EXISTS public.depots (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id),
    depot_code TEXT NOT NULL,
    name TEXT NOT NULL,
    capacity_vehicles INT NOT NULL,
    lat NUMERIC NOT NULL,
    lng NUMERIC NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.networks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id),
    name TEXT NOT NULL,
    city_region TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.incidents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id),
    incident_code TEXT NOT NULL,
    title TEXT NOT NULL,
    road_name TEXT NOT NULL,
    type TEXT NOT NULL,
    severity TEXT NOT NULL,
    affected_vehicles_count INT DEFAULT 0,
    affected_routes_count INT DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'Active',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.incidents ADD COLUMN IF NOT EXISTS affected_vehicles_count INT DEFAULT 0;
ALTER TABLE public.incidents ADD COLUMN IF NOT EXISTS affected_routes_count INT DEFAULT 0;
ALTER TABLE public.incidents ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'Active';

CREATE TABLE IF NOT EXISTS public.optimization_runs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id),
    run_code TEXT NOT NULL,
    algorithm TEXT NOT NULL,
    vehicles_count INT NOT NULL,
    customers_count INT NOT NULL,
    fitness_score NUMERIC,
    runtime_sec NUMERIC,
    travel_time_saved_percent NUMERIC,
    status TEXT NOT NULL DEFAULT 'Completed',
    parameters JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.optimization_runs ADD COLUMN IF NOT EXISTS fitness_score NUMERIC;
ALTER TABLE public.optimization_runs ADD COLUMN IF NOT EXISTS runtime_sec NUMERIC;
ALTER TABLE public.optimization_runs ADD COLUMN IF NOT EXISTS travel_time_saved_percent NUMERIC;
ALTER TABLE public.optimization_runs ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'Completed';
ALTER TABLE public.optimization_runs ADD COLUMN IF NOT EXISTS parameters JSONB;

-- -----------------------------------------------------------------------------
-- 7. ROAD NETWORK & EXTENDED TRANSPORTATION DOMAIN TABLES
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.road_networks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id),
    name TEXT NOT NULL,
    source TEXT NOT NULL DEFAULT 'OSM',
    version TEXT DEFAULT 'v1.0',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.network_nodes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    network_id UUID NOT NULL REFERENCES public.road_networks(id) ON DELETE CASCADE,
    external_id TEXT,
    lat NUMERIC NOT NULL,
    lng NUMERIC NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.network_edges (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    network_id UUID NOT NULL REFERENCES public.road_networks(id) ON DELETE CASCADE,
    external_id TEXT,
    from_node_id UUID REFERENCES public.network_nodes(id),
    to_node_id UUID REFERENCES public.network_nodes(id),
    road_name TEXT NOT NULL,
    length_meters NUMERIC NOT NULL DEFAULT 1000,
    speed_limit_kph NUMERIC NOT NULL DEFAULT 50,
    road_type TEXT DEFAULT 'PRIMARY',
    capacity_vehicles INT DEFAULT 200,
    geometry JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.network_edges ADD COLUMN IF NOT EXISTS geometry JSONB;

CREATE TABLE IF NOT EXISTS public.delivery_points (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id),
    customer_id UUID REFERENCES public.customers(id),
    point_code TEXT NOT NULL,
    name TEXT NOT NULL,
    demand_kg NUMERIC NOT NULL DEFAULT 50,
    time_window_start TEXT,
    time_window_end TEXT,
    service_time_seconds INT DEFAULT 600,
    priority TEXT DEFAULT 'Standard',
    status TEXT NOT NULL DEFAULT 'PENDING',
    lat NUMERIC NOT NULL,
    lng NUMERIC NOT NULL,
    address TEXT,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.delivery_points ADD COLUMN IF NOT EXISTS customer_id UUID REFERENCES public.customers(id);
ALTER TABLE public.delivery_points ADD COLUMN IF NOT EXISTS address TEXT;
ALTER TABLE public.delivery_points ADD COLUMN IF NOT EXISTS notes TEXT;
ALTER TABLE public.delivery_points ADD COLUMN IF NOT EXISTS priority TEXT DEFAULT 'Standard';
ALTER TABLE public.delivery_points ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'PENDING';

CREATE TABLE IF NOT EXISTS public.routes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id),
    route_code TEXT NOT NULL,
    vehicle_id UUID REFERENCES public.vehicles(id),
    depot_id UUID REFERENCES public.depots(id),
    optimization_run_id UUID REFERENCES public.optimization_runs(id),
    status TEXT NOT NULL DEFAULT 'PLANNED',
    distance_km NUMERIC DEFAULT 0,
    estimated_duration_min NUMERIC DEFAULT 0,
    actual_duration_min NUMERIC,
    delay_min INT DEFAULT 0,
    geometry_geojson JSONB,
    route_date DATE DEFAULT CURRENT_DATE,
    start_time TIMESTAMPTZ,
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.routes ADD COLUMN IF NOT EXISTS vehicle_id UUID REFERENCES public.vehicles(id);
ALTER TABLE public.routes ADD COLUMN IF NOT EXISTS depot_id UUID REFERENCES public.depots(id);
ALTER TABLE public.routes ADD COLUMN IF NOT EXISTS optimization_run_id UUID REFERENCES public.optimization_runs(id);
ALTER TABLE public.routes ADD COLUMN IF NOT EXISTS route_date DATE DEFAULT CURRENT_DATE;
ALTER TABLE public.routes ADD COLUMN IF NOT EXISTS start_time TIMESTAMPTZ;
ALTER TABLE public.routes ADD COLUMN IF NOT EXISTS started_at TIMESTAMPTZ;
ALTER TABLE public.routes ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ;

CREATE TABLE IF NOT EXISTS public.route_stops (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id),
    route_id UUID NOT NULL REFERENCES public.routes(id) ON DELETE CASCADE,
    delivery_point_id UUID REFERENCES public.delivery_points(id),
    sequence_number INT NOT NULL,
    eta TEXT,
    actual_arrival_time TIMESTAMPTZ,
    arrival_time TIMESTAMPTZ,
    departure_time TIMESTAMPTZ,
    estimated_arrival_time TIMESTAMPTZ,
    estimated_departure_time TIMESTAMPTZ,
    service_duration_seconds INT DEFAULT 600,
    distance_from_previous_meters NUMERIC,
    travel_time_from_previous_seconds NUMERIC,
    delay_seconds INT DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'PENDING',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.route_stops ADD COLUMN IF NOT EXISTS delivery_point_id UUID REFERENCES public.delivery_points(id);
ALTER TABLE public.route_stops ADD COLUMN IF NOT EXISTS arrival_time TIMESTAMPTZ;
ALTER TABLE public.route_stops ADD COLUMN IF NOT EXISTS departure_time TIMESTAMPTZ;
ALTER TABLE public.route_stops ADD COLUMN IF NOT EXISTS estimated_arrival_time TIMESTAMPTZ;
ALTER TABLE public.route_stops ADD COLUMN IF NOT EXISTS estimated_departure_time TIMESTAMPTZ;
ALTER TABLE public.route_stops ADD COLUMN IF NOT EXISTS service_duration_seconds INT DEFAULT 600;
ALTER TABLE public.route_stops ADD COLUMN IF NOT EXISTS distance_from_previous_meters NUMERIC;
ALTER TABLE public.route_stops ADD COLUMN IF NOT EXISTS travel_time_from_previous_seconds NUMERIC;
ALTER TABLE public.route_stops ADD COLUMN IF NOT EXISTS delay_seconds INT DEFAULT 0;

DO $$ BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'uq_route_sequence'
    ) THEN
        ALTER TABLE public.route_stops ADD CONSTRAINT uq_route_sequence UNIQUE (route_id, sequence_number);
    END IF;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

CREATE TABLE IF NOT EXISTS public.traffic_states (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id),
    edge_id UUID REFERENCES public.network_edges(id),
    road_segment_code TEXT NOT NULL,
    road_name TEXT NOT NULL,
    current_speed_kmh NUMERIC NOT NULL DEFAULT 40,
    free_flow_speed_kmh NUMERIC NOT NULL DEFAULT 50,
    congestion_percent NUMERIC NOT NULL DEFAULT 0,
    congestion_level TEXT NOT NULL DEFAULT 'NORMAL',
    travel_time_seconds NUMERIC,
    vehicle_count INT,
    capacity INT,
    source TEXT DEFAULT 'SIMULATION',
    timestamp TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.traffic_states ADD COLUMN IF NOT EXISTS edge_id UUID REFERENCES public.network_edges(id);
ALTER TABLE public.traffic_states ADD COLUMN IF NOT EXISTS travel_time_seconds NUMERIC;
ALTER TABLE public.traffic_states ADD COLUMN IF NOT EXISTS vehicle_count INT;
ALTER TABLE public.traffic_states ADD COLUMN IF NOT EXISTS capacity INT;
ALTER TABLE public.traffic_states ADD COLUMN IF NOT EXISTS source TEXT DEFAULT 'SIMULATION';
ALTER TABLE public.traffic_states ADD COLUMN IF NOT EXISTS timestamp TIMESTAMPTZ DEFAULT NOW();

CREATE TABLE IF NOT EXISTS public.restrictions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id),
    restriction_code TEXT NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    restriction_type TEXT NOT NULL,
    affected_road TEXT NOT NULL,
    edge_id UUID REFERENCES public.network_edges(id),
    vehicle_type TEXT,
    start_time TIME,
    end_time TIME,
    days_of_week TEXT,
    max_weight_kg NUMERIC,
    max_height_m NUMERIC,
    active_time_window TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    status TEXT NOT NULL DEFAULT 'ACTIVE',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.restrictions ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE public.restrictions ADD COLUMN IF NOT EXISTS edge_id UUID REFERENCES public.network_edges(id);
ALTER TABLE public.restrictions ADD COLUMN IF NOT EXISTS vehicle_type TEXT;
ALTER TABLE public.restrictions ADD COLUMN IF NOT EXISTS start_time TIME;
ALTER TABLE public.restrictions ADD COLUMN IF NOT EXISTS end_time TIME;
ALTER TABLE public.restrictions ADD COLUMN IF NOT EXISTS days_of_week TEXT;
ALTER TABLE public.restrictions ADD COLUMN IF NOT EXISTS max_height_m NUMERIC;
ALTER TABLE public.restrictions ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE;

CREATE TABLE IF NOT EXISTS public.optimization_results (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id),
    optimization_run_id UUID NOT NULL REFERENCES public.optimization_runs(id) ON DELETE CASCADE,
    vehicle_id UUID REFERENCES public.vehicles(id),
    route_id UUID REFERENCES public.routes(id),
    total_distance_km NUMERIC,
    total_travel_time_min NUMERIC,
    congestion_avoided_percent NUMERIC,
    fitness_value NUMERIC,
    result_details JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.optimization_results ADD COLUMN IF NOT EXISTS vehicle_id UUID REFERENCES public.vehicles(id);
ALTER TABLE public.optimization_results ADD COLUMN IF NOT EXISTS route_id UUID REFERENCES public.routes(id);
ALTER TABLE public.optimization_results ADD COLUMN IF NOT EXISTS result_details JSONB;

-- -----------------------------------------------------------------------------
-- 8. INDEXES FOR PERFORMANCE
-- -----------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_profiles_auth_user_id ON public.profiles(auth_user_id);
CREATE INDEX IF NOT EXISTS idx_profiles_organization_id ON public.profiles(organization_id);
CREATE INDEX IF NOT EXISTS idx_vehicles_organization_id ON public.vehicles(organization_id);
CREATE INDEX IF NOT EXISTS idx_customers_organization_id ON public.customers(organization_id);
CREATE INDEX IF NOT EXISTS idx_depots_organization_id ON public.depots(organization_id);
CREATE INDEX IF NOT EXISTS idx_networks_organization_id ON public.networks(organization_id);
CREATE INDEX IF NOT EXISTS idx_incidents_organization_id ON public.incidents(organization_id);
CREATE INDEX IF NOT EXISTS idx_optimization_runs_organization_id ON public.optimization_runs(organization_id);
CREATE INDEX IF NOT EXISTS idx_road_networks_organization_id ON public.road_networks(organization_id);
CREATE INDEX IF NOT EXISTS idx_network_nodes_network_id ON public.network_nodes(network_id);
CREATE INDEX IF NOT EXISTS idx_network_edges_network_id ON public.network_edges(network_id);
CREATE INDEX IF NOT EXISTS idx_network_edges_from_node_id ON public.network_edges(from_node_id);
CREATE INDEX IF NOT EXISTS idx_network_edges_to_node_id ON public.network_edges(to_node_id);
CREATE INDEX IF NOT EXISTS idx_delivery_points_organization_id ON public.delivery_points(organization_id);
CREATE INDEX IF NOT EXISTS idx_delivery_points_customer_id ON public.delivery_points(customer_id);
CREATE INDEX IF NOT EXISTS idx_routes_organization_id ON public.routes(organization_id);
CREATE INDEX IF NOT EXISTS idx_routes_vehicle_id ON public.routes(vehicle_id);
CREATE INDEX IF NOT EXISTS idx_routes_depot_id ON public.routes(depot_id);
CREATE INDEX IF NOT EXISTS idx_route_stops_organization_id ON public.route_stops(organization_id);
CREATE INDEX IF NOT EXISTS idx_route_stops_route_id ON public.route_stops(route_id);
CREATE INDEX IF NOT EXISTS idx_route_stops_delivery_point_id ON public.route_stops(delivery_point_id);
CREATE INDEX IF NOT EXISTS idx_traffic_states_organization_id ON public.traffic_states(organization_id);
CREATE INDEX IF NOT EXISTS idx_traffic_states_edge_id ON public.traffic_states(edge_id);
CREATE INDEX IF NOT EXISTS idx_restrictions_organization_id ON public.restrictions(organization_id);
CREATE INDEX IF NOT EXISTS idx_restrictions_edge_id ON public.restrictions(edge_id);
CREATE INDEX IF NOT EXISTS idx_optimization_results_organization_id ON public.optimization_results(organization_id);
CREATE INDEX IF NOT EXISTS idx_optimization_results_run_id ON public.optimization_results(optimization_run_id);

-- -----------------------------------------------------------------------------
-- 9. ROW LEVEL SECURITY (RLS) POLICIES
-- -----------------------------------------------------------------------------
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vehicles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.depots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.networks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.incidents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.optimization_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.road_networks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.delivery_points ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.routes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.route_stops ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.traffic_states ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.restrictions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.optimization_results ENABLE ROW LEVEL SECURITY;

-- Profiles Policies
DROP POLICY IF EXISTS "View organization profiles" ON public.profiles;
CREATE POLICY "View organization profiles" ON public.profiles
    FOR SELECT USING (organization_id = public.get_auth_org_id());

DROP POLICY IF EXISTS "Update own profile" ON public.profiles;
CREATE POLICY "Update own profile" ON public.profiles
    FOR UPDATE USING (auth_user_id = auth.uid());

-- Organization Isolation Policies
DROP POLICY IF EXISTS "Org Isolation Vehicles" ON public.vehicles;
CREATE POLICY "Org Isolation Vehicles" ON public.vehicles FOR ALL USING (organization_id = public.get_auth_org_id());

DROP POLICY IF EXISTS "Org Isolation Customers" ON public.customers;
CREATE POLICY "Org Isolation Customers" ON public.customers FOR ALL USING (organization_id = public.get_auth_org_id());

DROP POLICY IF EXISTS "Org Isolation Depots" ON public.depots;
CREATE POLICY "Org Isolation Depots" ON public.depots FOR ALL USING (organization_id = public.get_auth_org_id());

DROP POLICY IF EXISTS "Org Isolation Networks" ON public.networks;
CREATE POLICY "Org Isolation Networks" ON public.networks FOR ALL USING (organization_id = public.get_auth_org_id());

DROP POLICY IF EXISTS "Org Isolation Incidents" ON public.incidents;
CREATE POLICY "Org Isolation Incidents" ON public.incidents FOR ALL USING (organization_id = public.get_auth_org_id());

DROP POLICY IF EXISTS "Org Isolation Optimization Runs" ON public.optimization_runs;
CREATE POLICY "Org Isolation Optimization Runs" ON public.optimization_runs FOR ALL USING (organization_id = public.get_auth_org_id());

DROP POLICY IF EXISTS "Org Isolation Road Networks" ON public.road_networks;
CREATE POLICY "Org Isolation Road Networks" ON public.road_networks FOR ALL USING (organization_id = public.get_auth_org_id());

DROP POLICY IF EXISTS "Org Isolation Delivery Points" ON public.delivery_points;
CREATE POLICY "Org Isolation Delivery Points" ON public.delivery_points FOR ALL USING (organization_id = public.get_auth_org_id());

DROP POLICY IF EXISTS "Org Isolation Routes" ON public.routes;
CREATE POLICY "Org Isolation Routes" ON public.routes FOR ALL USING (organization_id = public.get_auth_org_id());

DROP POLICY IF EXISTS "Org Isolation Route Stops" ON public.route_stops;
CREATE POLICY "Org Isolation Route Stops" ON public.route_stops FOR ALL USING (organization_id = public.get_auth_org_id());

DROP POLICY IF EXISTS "Org Isolation Traffic States" ON public.traffic_states;
CREATE POLICY "Org Isolation Traffic States" ON public.traffic_states FOR ALL USING (organization_id = public.get_auth_org_id());

DROP POLICY IF EXISTS "Org Isolation Restrictions" ON public.restrictions;
CREATE POLICY "Org Isolation Restrictions" ON public.restrictions FOR ALL USING (organization_id = public.get_auth_org_id());

DROP POLICY IF EXISTS "Org Isolation Optimization Results" ON public.optimization_results;
CREATE POLICY "Org Isolation Optimization Results" ON public.optimization_results FOR ALL USING (organization_id = public.get_auth_org_id());

-- -----------------------------------------------------------------------------
-- 10. DEVELOPMENT SEED DATA (SIH 2026 Fleet Operations)
-- -----------------------------------------------------------------------------
INSERT INTO public.depots (id, organization_id, depot_code, name, capacity_vehicles, lat, lng)
VALUES 
  ('11111111-1111-1111-1111-111111111111', '00000000-0000-0000-0000-000000000001', 'DEPOT-CENTRAL', 'Central Rajpur Depot', 20, 21.2514, 81.6296),
  ('22222222-2222-2222-2222-222222222222', '00000000-0000-0000-0000-000000000001', 'DEPOT-NORTH', 'North Logistics Hub', 15, 21.2720, 81.6450)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.traffic_states (id, organization_id, road_segment_code, road_name, current_speed_kmh, free_flow_speed_kmh, congestion_percent, congestion_level)
VALUES 
  ('33333333-3333-3333-3333-333333333333', '00000000-0000-0000-0000-000000000001', 'SEG-E17', 'Expressway E17 Segment 4', 12, 50, 78, 'CRITICAL'),
  ('44444444-4444-4444-4444-444444444444', '00000000-0000-0000-0000-000000000001', 'SEG-CENTRAL', 'Central Link Arterial', 34, 50, 32, 'NORMAL')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.restrictions (id, organization_id, restriction_code, name, restriction_type, affected_road, max_weight_kg, active_time_window, status)
VALUES 
  ('55555555-5555-5555-5555-555555555555', '00000000-0000-0000-0000-000000000001', 'RST-HEAVY-01', 'Heavy Vehicle Express Exclusion', 'WEIGHT_LIMIT', 'Expressway E17 Segment 4', 5000, '08:00 - 11:00 AM', 'ACTIVE')
ON CONFLICT (id) DO NOTHING;
