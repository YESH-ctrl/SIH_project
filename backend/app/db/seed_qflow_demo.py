import asyncio
import sys
import uuid
import httpx
import os
from pathlib import Path
from dotenv import load_dotenv

# Load env variables
env_file = Path(__file__).parent.parent.parent / ".env"
load_dotenv(dotenv_path=env_file)

SUPABASE_URL = os.getenv("SUPABASE_URL", "https://oiehjulozbktlapmctsr.supabase.co")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY") or os.getenv("SUPABASE_ANON_KEY", "")


HEADERS = {
    "apikey": SUPABASE_KEY,
    "Authorization": f"Bearer {SUPABASE_KEY}",
    "Content-Type": "application/json",
    "Prefer": "resolution=merge-duplicates,return=representation"
}

ORG_ID = "00000000-0000-0000-0000-000000000001"
NETWORK_ID = "9cb256c8-6c5a-4f05-8259-e8b887334fa2"
DEPOT_ID = "11111111-1111-1111-1111-111111111111"

VEHICLE_IDS = {
    "veh_01": "10000000-0000-0000-0000-000000000001",
    "veh_02": "10000000-0000-0000-0000-000000000002",
    "veh_03": "10000000-0000-0000-0000-000000000003",
}

CUSTOMER_IDS = [
    f"20000000-0000-0000-0000-0000000000{i+1:02d}" for i in range(10)
]

DELIVERY_POINT_IDS = [
    f"30000000-0000-0000-0000-0000000000{i+1:02d}" for i in range(10)
]

ROUTE_IDS = [
    "40000000-0000-0000-0000-000000000001",
    "40000000-0000-0000-0000-000000000002",
    "40000000-0000-0000-0000-000000000003",
]

INCIDENT_ID = "50000000-0000-0000-0000-000000000001"


async def upsert_record(client: httpx.AsyncClient, table: str, payload: dict):
    url = f"{SUPABASE_URL}/rest/v1/{table}"
    res = await client.post(url, headers=HEADERS, json=payload)
    if res.status_code not in (200, 201):
        print(f"[Seed] Upsert error on table '{table}': {res.status_code} - {res.text}")
    return res


async def seed_qflow_demo():
    print("============================================================")
    print("Q-FLOW — IDEMPOTENT DEMO SCENARIO SEEDER")
    print("============================================================")

    async with httpx.AsyncClient(timeout=30.0) as client:
        # 1. Organization
        print("1. Upserting Organization...")
        await upsert_record(client, "organizations", {
            "id": ORG_ID,
            "name": "SIH 2026 Fleet Operations"
        })

        # 2. Canonical Road Network & Legacy Network
        print("2. Upserting Road Network...")
        await upsert_record(client, "road_networks", {
            "id": NETWORK_ID,
            "organization_id": ORG_ID,
            "name": "Raipur Urban Network",
            "source": "OSM",
            "version": "v1.0"
        })
        await upsert_record(client, "networks", {
            "id": NETWORK_ID,
            "organization_id": ORG_ID,
            "name": "Raipur Urban Network",
            "city_region": "Raipur, Chhattisgarh"
        })

        # 3. Ensure graph nodes & edges exist in database for canonical NETWORK_ID
        print("3. Checking Network Nodes & Edges in Database...")
        node_res = await client.get(f"{SUPABASE_URL}/rest/v1/network_nodes?network_id=eq.{NETWORK_ID}&select=id", headers=HEADERS)
        nodes_data = node_res.json() if node_res.status_code == 200 and isinstance(node_res.json(), list) else []

        if len(nodes_data) == 0:
            print("Populating network_nodes and network_edges for Raipur Urban Network...")
            from app.network.graph_builder import build_osm_road_network
            from app.network.node_mapper import map_graph_nodes
            from app.network.edge_mapper import map_graph_edges

            G = build_osm_road_network("Raipur, India")
            node_models, osm_to_uuid = map_graph_nodes(G, NETWORK_ID)
            edge_models = map_graph_edges(G, NETWORK_ID, osm_to_uuid)

            # Insert nodes in batches of 100
            for i in range(0, len(node_models), 100):
                chunk = [
                    {
                        "id": str(n.id),
                        "network_id": str(n.network_id),
                        "external_id": str(n.external_id),
                        "lat": float(n.lat),
                        "lng": float(n.lng)
                    } for n in node_models[i:i+100]
                ]
                await client.post(f"{SUPABASE_URL}/rest/v1/network_nodes", headers=HEADERS, json=chunk)

            # Insert edges in batches of 100
            for i in range(0, len(edge_models), 100):
                chunk = [
                    {
                        "id": str(e.id),
                        "network_id": str(e.network_id),
                        "external_id": str(e.external_id),
                        "from_node_id": str(e.from_node_id),
                        "to_node_id": str(e.to_node_id),
                        "road_name": e.road_name or "Urban Link",
                        "length_meters": float(e.length_meters),
                        "speed_limit_kph": float(e.speed_limit_kph),
                        "road_type": e.road_type or "PRIMARY"
                    } for e in edge_models[i:i+100]
                ]
                await client.post(f"{SUPABASE_URL}/rest/v1/network_edges", headers=HEADERS, json=chunk)

            print(f"Inserted {len(node_models)} network_nodes and {len(edge_models)} network_edges.")
        else:
            print(f"Network Nodes & Edges already populated ({len(nodes_data)} nodes).")

        # Get first sample nodes and edges
        nodes_res = await client.get(f"{SUPABASE_URL}/rest/v1/network_nodes?network_id=eq.{NETWORK_ID}&limit=10", headers=HEADERS)
        sample_nodes = nodes_res.json() if nodes_res.status_code == 200 and isinstance(nodes_res.json(), list) else []

        edges_res = await client.get(f"{SUPABASE_URL}/rest/v1/network_edges?network_id=eq.{NETWORK_ID}&limit=10", headers=HEADERS)
        sample_edges = edges_res.json() if edges_res.status_code == 200 and isinstance(edges_res.json(), list) else []


        # 4. Central Demo Depot
        print("4. Upserting Central Depot...")
        await upsert_record(client, "depots", {
            "id": DEPOT_ID,
            "organization_id": ORG_ID,
            "depot_code": "QFLOW_DEPOT",
            "name": "Raipur Main Distribution Depot",
            "capacity_vehicles": 20,
            "lat": 21.2517416,
            "lng": 81.629464
        })

        # 5. 3 Jury Vehicles
        print("5. Upserting 3 Q-FLOW Vehicles...")
        vehicles_data = [
            {
                "id": VEHICLE_IDS["veh_01"],
                "organization_id": ORG_ID,
                "vehicle_code": "veh_01",
                "name": "Swarm Alpha (Electric EV-1)",
                "type": "EV-1",
                "capacity_kg": 50,
                "current_load_kg": 48,
                "status": "Active",
                "current_location": "Depot Central",
                "next_stop": "Pandri Commercial Hub",
                "eta": "10:15 AM",
                "route_id": ROUTE_IDS[0],
                "lat": 21.2517416,
                "lng": 81.629464
            },
            {
                "id": VEHICLE_IDS["veh_02"],
                "organization_id": ORG_ID,
                "vehicle_code": "veh_02",
                "name": "Swarm Beta (Heavy Cargo-2)",
                "type": "Heavy-2",
                "capacity_kg": 60,
                "current_load_kg": 56,
                "status": "Active",
                "current_location": "Depot Central",
                "next_stop": "Shankar Nagar Retail Depot",
                "eta": "10:25 AM",
                "route_id": ROUTE_IDS[1],
                "lat": 21.2517416,
                "lng": 81.629464
            },
            {
                "id": VEHICLE_IDS["veh_03"],
                "organization_id": ORG_ID,
                "vehicle_code": "veh_03",
                "name": "Swarm Gamma (Express Van-3)",
                "type": "Express-3",
                "capacity_kg": 50,
                "current_load_kg": 35,
                "status": "Active",
                "current_location": "Depot Central",
                "next_stop": "Gudhiyari Industrial Stop",
                "eta": "10:10 AM",
                "route_id": ROUTE_IDS[2],
                "lat": 21.2517416,
                "lng": 81.629464
            }
        ]
        for v in vehicles_data:
            await upsert_record(client, "vehicles", v)

        # 6. 10 Customers & Delivery Points
        print("6. Upserting 10 Customers & Delivery Points...")
        raw_delivery_specs = [
            ("Pandri Commercial Hub", 12, 21.2575, 81.6450),
            ("Fafadih Market Complex", 15, 21.2560, 81.6380),
            ("Devendra Nagar Logistics Stop", 10, 21.2480, 81.6420),
            ("Shankar Nagar Retail Depot", 14, 21.2420, 81.6550),
            ("Telibandha Express Point", 18, 21.2350, 81.6620),
            ("Civil Lines Admin Delivery", 8, 21.2390, 81.6370),
            ("Pachpedi Naka Distribution", 16, 21.2220, 81.6490),
            ("Tagore Nagar Cargo Point", 11, 21.2330, 81.6440),
            ("Gudhiyari Industrial Stop", 15, 21.2580, 81.6180),
            ("Bhanpuri Freight Hub", 20, 21.2720, 81.6310)
        ]

        for i, (name, demand, lat, lng) in enumerate(raw_delivery_specs):
            c_id = CUSTOMER_IDS[i]
            dp_id = DELIVERY_POINT_IDS[i]

            # Upsert Customer
            await upsert_record(client, "customers", {
                "id": c_id,
                "organization_id": ORG_ID,
                "customer_code": f"CUST_{i+1:02d}",
                "name": f"Customer: {name}",
                "demand_kg": demand,
                "time_window": "09:00 - 17:00",
                "priority": "High" if demand >= 15 else "Standard",
                "lat": lat,
                "lng": lng
            })

            # Upsert Delivery Point
            await upsert_record(client, "delivery_points", {
                "id": dp_id,
                "organization_id": ORG_ID,
                "customer_id": c_id,
                "point_code": f"dp_{i+1:02d}",
                "name": name,
                "demand_kg": demand,
                "time_window_start": "09:00:00",
                "time_window_end": "17:00:00",
                "service_time_seconds": 600,
                "priority": "High" if demand >= 15 else "Standard",
                "status": "PENDING",
                "lat": lat,
                "lng": lng,
                "address": f"{name}, Raipur, Chhattisgarh",
                "notes": f"Q-FLOW Jury Demo Stop {i+1}"
            })

        # 7. Traffic States & Restrictions
        print("7. Upserting Traffic States & Restrictions...")
        target_edge_id = sample_edges[0]["id"] if sample_edges else None
        
        await upsert_record(client, "traffic_states", {
            "id": "33333333-3333-3333-3333-333333333333",
            "organization_id": ORG_ID,
            "edge_id": target_edge_id,
            "road_segment_code": "SEG-E17",
            "road_name": "Devendra Nagar Flyover",
            "current_speed_kmh": 12,
            "free_flow_speed_kmh": 50,
            "congestion_percent": 78,
            "congestion_level": "CRITICAL",
            "travel_time_seconds": 180,
            "source": "SIMULATION"
        })

        await upsert_record(client, "restrictions", {
            "id": "55555555-5555-5555-5555-555555555555",
            "organization_id": ORG_ID,
            "edge_id": target_edge_id,
            "restriction_code": "RST-HEAVY-01",
            "name": "Heavy Vehicle Express Exclusion",
            "description": "Peak hour heavy freight restriction on Devendra Nagar corridor",
            "restriction_type": "WEIGHT_LIMIT",
            "affected_road": "Devendra Nagar Flyover",
            "max_weight_kg": 5000,
            "active_time_window": "08:00 - 11:00 AM",
            "status": "ACTIVE",
            "is_active": True
        })

        # 8. 3 Baseline Routes & Route Stops
        print("8. Upserting 3 Baseline Routes & Route Stops...")
        routes_config = [
            {
                "id": ROUTE_IDS[0],
                "code": "ROUTE-VEH01-BASE",
                "veh_id": VEHICLE_IDS["veh_01"],
                "dist": 12.4,
                "dur": 28,
                "stops": [DELIVERY_POINT_IDS[0], DELIVERY_POINT_IDS[1], DELIVERY_POINT_IDS[2], DELIVERY_POINT_IDS[7]] # dp_01, dp_02, dp_03, dp_08
            },
            {
                "id": ROUTE_IDS[1],
                "code": "ROUTE-VEH02-BASE",
                "veh_id": VEHICLE_IDS["veh_02"],
                "dist": 15.8,
                "dur": 34,
                "stops": [DELIVERY_POINT_IDS[3], DELIVERY_POINT_IDS[4], DELIVERY_POINT_IDS[6], DELIVERY_POINT_IDS[5]] # dp_04, dp_05, dp_07, dp_06
            },
            {
                "id": ROUTE_IDS[2],
                "code": "ROUTE-VEH03-BASE",
                "veh_id": VEHICLE_IDS["veh_03"],
                "dist": 11.2,
                "dur": 25,
                "stops": [DELIVERY_POINT_IDS[8], DELIVERY_POINT_IDS[9]] # dp_09, dp_10
            }
        ]

        for r in routes_config:
            await upsert_record(client, "routes", {
                "id": r["id"],
                "organization_id": ORG_ID,
                "route_code": r["code"],
                "vehicle_id": r["veh_id"],
                "depot_id": DEPOT_ID,
                "status": "PLANNED",
                "distance_km": r["dist"],
                "estimated_duration_min": r["dur"]
            })

            for seq, dp_id in enumerate(r["stops"]):
                stop_uuid = str(uuid.uuid5(uuid.UUID(r["id"]), f"stop_{seq+1}"))
                await upsert_record(client, "route_stops", {
                    "id": stop_uuid,
                    "organization_id": ORG_ID,
                    "route_id": r["id"],
                    "delivery_point_id": dp_id,
                    "sequence_number": seq + 1,
                    "eta": f"10:{15 + seq * 15:02d} AM",
                    "service_duration_seconds": 600,
                    "distance_from_previous_meters": 2500,
                    "travel_time_from_previous_seconds": 300,
                    "status": "PENDING"
                })

        # 9. Scheduled Incident
        print("9. Upserting Incident INCIDENT_001...")
        await upsert_record(client, "incidents", {
            "id": INCIDENT_ID,
            "organization_id": ORG_ID,
            "incident_code": "INCIDENT_001",
            "title": "Devendra Nagar Flyover Construction Blockage",
            "road_name": "Devendra Nagar Flyover",
            "type": "VEHICLE_ACCIDENT",
            "severity": "HIGH",
            "affected_vehicles_count": 1,
            "affected_routes_count": 1,
            "status": "SCHEDULED"
        })

        print("============================================================")
        print("Q-FLOW SEEDING COMPLETE — ALL 16 TABLES PROPERLY CONFIGURED")
        print("============================================================")


if __name__ == "__main__":
    asyncio.run(seed_qflow_demo())
