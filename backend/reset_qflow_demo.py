import sys
import os
import asyncio
from pathlib import Path

backend_dir = Path(__file__).parent / "backend"
sys.path.insert(0, str(backend_dir))

from app.db.reset_qflow_demo import reset_qflow_demo

if __name__ == "__main__":
    asyncio.run(reset_qflow_demo())
