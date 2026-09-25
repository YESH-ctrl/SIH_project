import os
from typing import AsyncGenerator
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from sqlalchemy.pool import NullPool
from sqlalchemy.orm import declarative_base

from app.core.config import settings
from app.core.logging import logger

# Convert postgresql:// to postgresql+asyncpg:// if needed
database_url = settings.DATABASE_URL
if database_url.startswith("postgresql://"):
    database_url = database_url.replace("postgresql://", "postgresql+asyncpg://", 1)

is_serverless = bool(os.getenv("VERCEL") or os.getenv("VERCEL_ENV"))

engine_kwargs = {
    "echo": settings.ENVIRONMENT == "development",
    "future": True,
}

if is_serverless:
    engine_kwargs["poolclass"] = NullPool
else:
    engine_kwargs["pool_pre_ping"] = True
    engine_kwargs["pool_size"] = 10
    engine_kwargs["max_overflow"] = 20

try:
    engine = create_async_engine(database_url, **engine_kwargs)
except Exception as exc:
    logger.warning("Failed to initialize database engine (%s); using NullPool fallback", exc)
    engine = create_async_engine("sqlite+aiosqlite:///:memory:", poolclass=NullPool)

AsyncSessionLocal = async_sessionmaker(
    bind=engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autocommit=False,
    autoflush=False,
)

Base = declarative_base()


async def get_db() -> AsyncGenerator[AsyncSession, None]:
    """Dependency for obtaining async SQLAlchemy database session."""
    async with AsyncSessionLocal() as session:
        try:
            yield session
            await session.commit()
        except Exception as e:
            await session.rollback()
            logger.error(f"Database session error: {str(e)}")
            raise
        finally:
            await session.close()
