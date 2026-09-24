import asyncio
import os
import sys
from pathlib import Path
from dotenv import load_dotenv

# Re-configure sys.stdout to handle utf-8 if needed on Windows
if sys.platform == "win32":
    try:
        sys.stdout.reconfigure(encoding="utf-8")
    except Exception:
        pass

# Load backend .env file
env_path = Path(__file__).parent / ".env"
load_dotenv(dotenv_path=env_path)

import asyncpg

async def run_migration():
    schema_path = Path(__file__).parent / "supabase_schema.sql"
    if not schema_path.exists():
        print(f"[ERROR] {schema_path} does not exist.")
        sys.exit(1)

    with open(schema_path, "r", encoding="utf-8") as f:
        sql_content = f.read()

    db_url = os.getenv("DATABASE_URL", "postgresql://postgres:postgres@localhost:5432/qflow_db")
    if db_url.startswith("postgresql+asyncpg://"):
        db_url = db_url.replace("postgresql+asyncpg://", "postgresql://", 1)

    print("[INFO] Connecting to PostgreSQL database...")
    print(f"[INFO] Reading DDL script from {schema_path.name}...")

    try:
        conn = await asyncpg.connect(db_url, timeout=10)
        print("[SUCCESS] Connected to PostgreSQL database.")
        print("[INFO] Executing schema migration script...")
        await conn.execute(sql_content)
        await conn.close()
        print("[SUCCESS] Successfully executed supabase_schema.sql on database!")
    except Exception as e:
        print(f"[NOTICE] Direct PostgreSQL execution error: {e}")
        print("[INFO] Note: If connecting to live Supabase cloud, ensure DATABASE_URL in backend/.env includes valid database connection password.")

if __name__ == "__main__":
    asyncio.run(run_migration())
