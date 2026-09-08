import os
import httpx
from fastapi import APIRouter, HTTPException
from typing import Dict, Any
from dotenv import load_dotenv

load_dotenv()

router = APIRouter(prefix="/demo", tags=["Demo Scenario"])

SUPABASE_URL = os.getenv("SUPABASE_URL", "https://oiehjulozbktlapmctsr.supabase.co")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY") or os.getenv("SUPABASE_ANON_KEY", "")


HEADERS = {
    "apikey": SUPABASE_KEY,
    "Authorization": f"Bearer {SUPABASE_KEY}",
    "Content-Type": "application/json"
}

ORG_ID = "00000000-0000-0000-0000-000000000001"


async def fetch_table_data(client: httpx.AsyncClient, table: str, filter_org: bool = True) -> list:
    url = f"{SUPABASE_URL}/rest/v1/{table}?select=*"
    if filter_org:
        url += f"&organization_id=eq.{ORG_ID}"
    res = await client.get(url, headers=HEADERS)
    if res.status_code == 200 and isinstance(res.json(), list):
        return res.json()
    return []


@router.get("/scenario", response_model=Dict[str, Any])
async def get_demo_scenario():
    """
    GET /api/v1/demo/scenario
    Returns the complete relational Q-FLOW demo scenario from PostgreSQL / Supabase.
    Single source of truth for the entire application.
    """
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            orgs = await fetch_table_data(client, "organizations", filter_org=False)
            org = orgs[0] if orgs else {"id": ORG_ID, "name": "SIH 2026 Fleet Operations"}

            networks = await fetch_table_data(client, "road_networks")
            network = networks[0] if networks else {
                "id": "9cb256c8-6c5a-4f05-8259-e8b887334fa2",
                "name": "Raipur Urban Network",
                "source": "OSM",
                "version": "v1.0"
            }

            depots = await fetch_table_data(client, "depots")
            depot = depots[0] if depots else {
                "id": "11111111-1111-1111-1111-111111111111",
                "depot_code": "QFLOW_DEPOT",
                "name": "Raipur Main Distribution Depot",
                "capacity_vehicles": 20,
                "lat": 21.2517416,
                "lng": 81.629464
            }

            vehicles = await fetch_table_data(client, "vehicles")
            customers = await fetch_table_data(client, "customers")
            delivery_points = await fetch_table_data(client, "delivery_points")
            routes = await fetch_table_data(client, "routes")
            route_stops = await fetch_table_data(client, "route_stops")
            traffic_states = await fetch_table_data(client, "traffic_states")
            restrictions = await fetch_table_data(client, "restrictions")
            incidents = await fetch_table_data(client, "incidents")
            optimization_runs = await fetch_table_data(client, "optimization_runs")
            optimization_results = await fetch_table_data(client, "optimization_results")
            profiles = await fetch_table_data(client, "profiles")

            return {
                "scenario_id": "QFLOW_JURY_DEMO_01",
                "organization": org,
                "network": network,
                "depot": depot,
                "vehicles": vehicles,
                "customers": customers,
                "delivery_points": delivery_points,
                "routes": routes,
                "route_stops": route_stops,
                "traffic_states": traffic_states,
                "restrictions": restrictions,
                "incidents": incidents,
                "optimization_runs": optimization_runs,
                "optimization_results": optimization_results,
                "profiles": profiles
            }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch scenario: {str(e)}")
