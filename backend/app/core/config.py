import json
from typing import List, Union
from pydantic import Field, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    PROJECT_NAME: str = "Q-FLOW Fleet Intelligence Backend"
    VERSION: str = "2.4.0"
    ENVIRONMENT: str = "development"
    LOG_LEVEL: str = "INFO"

    CORS_ORIGINS: List[str] = [
        "http://localhost:3000",
        "http://localhost:3009",
        "http://localhost:5173",
        "http://127.0.0.1:3009",
    ]

    # Supabase Configuration
    SUPABASE_URL: str = Field(default="https://oiehjulozbktlapmctsr.supabase.co")
    SUPABASE_ANON_KEY: str = Field(default="sb_publishable_VFCbkxMC6AhePvJ6N6fVUA_bT4cVkyi")
    SUPABASE_SERVICE_ROLE_KEY: str = Field(default="")
    SUPABASE_JWT_SECRET: str = Field(default="super-secret-jwt-key")

    # PostgreSQL Database URL
    DATABASE_URL: str = Field(
        default="postgresql+asyncpg://postgres:postgres@localhost:5432/qflow_db"
    )

    # Redis Cache & Job Queue
    REDIS_URL: str = Field(default="redis://localhost:6379/0")

    @field_validator("CORS_ORIGINS", mode="before")
    @classmethod
    def parse_cors_origins(cls, v: Union[str, List[str]]) -> List[str]:
        if isinstance(v, str):
            if v.startswith("["):
                try:
                    return json.loads(v)
                except Exception:
                    pass
            return [i.strip() for i in v.split(",")]
        return v

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )


settings = Settings()
