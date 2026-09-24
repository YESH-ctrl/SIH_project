import sys
import os
import asyncio
from pathlib import Path

backend_dir = Path(__file__).parent / "backend"
sys.path.insert(0, str(backend_dir))

from app.db.validate_qflow_database import validate_qflow_database

if __name__ == "__main__":
    ret = asyncio.run(validate_qflow_database())
    sys.exit(ret)
