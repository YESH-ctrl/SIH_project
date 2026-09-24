"""Quick database connectivity check for Q-FLOW.

Usage:
    py -3.12 check_db.py

Loads backend/.env, connects with asyncpg using DATABASE_URL, and prints a
diagnosis (wrong password vs. temporarily blocked vs. success).
"""
import asyncio
import os
from pathlib import Path
from urllib.parse import quote

from dotenv import load_dotenv

env_path = Path(__file__).parent / ".env"
load_dotenv(env_path)

url = os.getenv("DATABASE_URL", "")
if not url:
    print("DATABASE_URL is not set in backend/.env")
    raise SystemExit(1)

display = url.split("@")[-1] if "@" in url else "<host>"
print(f"Connecting to: ...@{display}")


async def main() -> None:
    import asyncpg

    try:
        conn = await asyncpg.connect(url, timeout=20)
        version = await conn.fetchval("SELECT version()")
        await conn.close()
        print("DATABASE CONNECTION OK")
        print("Server:", str(version).split(",")[0])
    except Exception as exc:
        name = type(exc).__name__
        msg = str(exc)
        if "InvalidPasswordError" in name or "password authentication failed" in msg:
            print("DIAGNOSIS: Wrong password (or wrong username format).")
            print("  - Supabase pooler usernames look like: postgres.<project-ref>")
            print("  - Reset the postgres password in Supabase Dashboard >")
            print("    Project Settings > Database > Reset database password.")
        elif "ECIRCUITBREAKER" in msg or "EAUTHQUERY" in msg:
            print("DIAGNOSIS: Supabase temporarily blocked this IP after the")
            print("  earlier failed attempts. Wait ~5 minutes and re-run.")
        else:
            print(f"DIAGNOSIS: {name}: {msg[:200]}")


asyncio.run(main())
