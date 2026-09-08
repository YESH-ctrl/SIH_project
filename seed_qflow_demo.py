import sys
import os
import asyncio
from pathlib import Path

# Add backend directory to sys.path
backend_dir = Path(__file__).parent / "backend"
sys.path.insert(0, str(backend_dir))

from app.db.seed_qflow_demo import seed_qflow_demo

if __name__ == "__main__":
    asyncio.run(seed_qflow_demo())
