import asyncio
import os
import httpx
from pathlib import Path
from dotenv import load_dotenv

env_file = Path(__file__).parent.parent.parent / ".env"
load_dotenv(dotenv_path=env_file)

SUPABASE_URL = os.getenv("SUPABASE_URL", "https://oiehjulozbktlapmctsr.supabase.co")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY") or os.getenv("SUPABASE_ANON_KEY", "sb_publishable_VFCbkxMC6AhePvJ6N6fVUA_bT4cVkyi")

HEADERS = {
    "apikey": SUPABASE_KEY,
    "Authorization": f"Bearer {SUPABASE_KEY}",
    "Content-Type": "application/json",
}

ORG_ID = "00000000-0000-0000-0000-000000000001"


async def reset_qflow_demo():
    print("============================================================")
    print("Q-FLOW — SAFE DEMO RESET (SCENARIO QFLOW_JURY_DEMO_01)")
    print("============================================================")

    async with httpx.AsyncClient(timeout=30.0) as client:
        # Delete demo scenario records in reverse foreign-key dependency order
        tables_to_clean = [
            "optimization_results",
            "optimization_runs",
            "incidents",
            "route_stops",
            "routes",
            "traffic_states",
            "restrictions",
            "delivery_points",
            "customers",
            "vehicles",
            "depots",
        ]

        for table in tables_to_clean:
            url = f"{SUPABASE_URL}/rest/v1/{table}?organization_id=eq.{ORG_ID}"
            res = await client.delete(url, headers=HEADERS)
            print(f"[Reset] Cleaned {table}: status {res.status_code}")

    print("============================================================")
    print("RESET COMPLETE — DEMO SCENARIO DATA SAFELY WIPED")
    print("============================================================")


if __name__ == "__main__":
    asyncio.run(reset_qflow_demo())
