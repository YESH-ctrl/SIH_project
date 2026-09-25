import json
from typing import List, Optional, Union
from pydantic import Field, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    PROJECT_NAME: str = "Q-FLOW Fleet Intelligence Backend"
    VERSION: str = "3.0.0"
    ENVIRONMENT: str = "development"
    LOG_LEVEL: str = "INFO"

    # -------------------------------------------------------------------------
    # DATA MODE: live | simulation | test
    #   live       -> real GPS telemetry + configured external traffic provider
    #   simulation -> SUMO generates PositionEvents (clearly labelled SIMULATION)
    #   test       -> deterministic fixtures, never used as a live fallback
    # -------------------------------------------------------------------------
    DATA_MODE: str = Field(default="live")

    CORS_ORIGINS: List[str] = [
        "https://sih-project-ten-red.vercel.app",
        "http://localhost:3000",
        "http://localhost:3001",
        "http://localhost:3002",
        "http://localhost:3009",
        "http://localhost:5173",
        "http://localhost:5174",
        "http://127.0.0.1:3000",
        "http://127.0.0.1:3001",
        "http://127.0.0.1:3002",
        "http://127.0.0.1:3009",
        "http://127.0.0.1:5173",
        "http://127.0.0.1:5174",
    ]


    # Supabase Configuration
    SUPABASE_URL: str = Field(default="")
    SUPABASE_ANON_KEY: str = Field(default="")
    SUPABASE_SERVICE_ROLE_KEY: str = Field(default="")
    SUPABASE_JWT_SECRET: str = Field(default="")

    # PostgreSQL Database URL
    DATABASE_URL: str = Field(
        default="postgresql+asyncpg://postgres:postgres@localhost:5432/qflow_db"
    )

    # Redis Cache & Job Queue (optional)
    REDIS_URL: str = Field(default="redis://localhost:6379/0")

    # -------------------------------------------------------------------------
    # Telemetry ingestion / GPS security
    # -------------------------------------------------------------------------
    # Shared secret for device -> backend telemetry POSTs (Authorization: Bearer).
    GPS_AUTH_SECRET: str = Field(default="")
    # Rate limit: max telemetry requests per device per minute.
    TELEMETRY_RATE_LIMIT_PER_MIN: int = 240
    # A GPS fix newer than this many seconds in the future is rejected (clock skew).
    TELEMETRY_MAX_FUTURE_SKEW_S: float = 5.0
    # A GPS fix older than this is rejected as stale/replayed.
    TELEMETRY_MAX_AGE_S: float = 300.0
    # Max plausible vehicle speed (km/h); positions implying more are rejected.
    TELEMETRY_MAX_SPEED_KMH: float = 160.0
    # Max implied speed between consecutive fixes of the same vehicle (km/h).
    TELEMETRY_MAX_JUMP_SPEED_KMH: float = 250.0
    # Reject fixes farther than this from the operating region centroid (sanity).
    TELEMETRY_MAX_REGION_RADIUS_KM: float = 150.0

    # -------------------------------------------------------------------------
    # Vehicle staleness ladder (seconds since last GPS fix)
    # -------------------------------------------------------------------------
    STALE_LIVE_S: float = 10.0
    STALE_DEGRADED_S: float = 30.0
    STALE_STALE_S: float = 120.0
    STALE_OFFLINE_S: float = 300.0

    # -------------------------------------------------------------------------
    # Map matching
    # -------------------------------------------------------------------------
    MAP_MATCH_MAX_CANDIDATES: int = 6
    MAP_MATCH_SEARCH_RADIUS_M: float = 35.0
    MAP_MATCH_MIN_CONFIDENCE: float = 0.15

    # -------------------------------------------------------------------------
    # Traffic engine
    # -------------------------------------------------------------------------
    TRAFFIC_MIN_SAMPLES: int = 3
    TRAFFIC_OBSERVATION_TTL_S: float = 300.0
    TRAFFIC_MIN_SPEED_KMH: float = 5.0
    TRAFFIC_OUTLIER_STD_DEVS: float = 2.5
    TRAFFIC_ENGINE_INTERVAL_S: float = 10.0

    # -------------------------------------------------------------------------
    # External traffic provider (none | google | mapbox)
    # -------------------------------------------------------------------------
    TRAFFIC_PROVIDER: str = Field(default="none")
    TRAFFIC_API_KEY: str = Field(default="")
    TRAFFIC_PROVIDER_CACHE_TTL_S: float = 120.0
    TRAFFIC_PROVIDER_MIN_INTERVAL_S: float = 30.0

    # -------------------------------------------------------------------------
    # Incident engine
    # -------------------------------------------------------------------------
    INCIDENT_ANOMALY_SPEED_DROP_RATIO: float = 0.35
    INCIDENT_ANOMALY_MIN_VEHICLES: int = 2
    INCIDENT_ANOMALY_PERSIST_S: float = 90.0
    INCIDENT_ANOMALY_CONFIDENCE: float = 0.55
    INCIDENT_DEFAULT_TTL_S: float = 3600.0

    # -------------------------------------------------------------------------
    # Rerouting thresholds (configurable, Section 14)
    # -------------------------------------------------------------------------
    REROUTE_MIN_ETA_GAIN_S: float = 120.0
    REROUTE_MIN_IMPROVEMENT_PCT: float = 8.0
    REROUTE_COOLDOWN_S: float = 30.0
    REROUTE_MANEUVER_PROXIMITY_M: float = 60.0

    # -------------------------------------------------------------------------
    # QPSO / optimization
    # -------------------------------------------------------------------------
    QPSO_POPULATION_SIZE: int = 24
    QPSO_ITERATIONS: int = 60
    QPSO_BETA: float = 0.75
    QPSO_MIN_INTERVAL_S: float = 20.0
    QPSO_ROUTE_CHANGE_PENALTY_S: float = 45.0
    QPSO_INCIDENT_PENALTY_S: float = 600.0
    OPTIMIZATION_MIN_VEHICLES: int = 1

    # -------------------------------------------------------------------------
    # Realtime
    # -------------------------------------------------------------------------
    REALTIME_MAX_CONNECTIONS: int = 200

    # -------------------------------------------------------------------------
    # SUMO simulation adapter
    # -------------------------------------------------------------------------
    SUMO_BINARY: str = Field(default="sumo")
    SUMO_CONFIG_FILE: str = Field(default="")
    SUMO_STEP_LENGTH_S: float = 1.0
    SUMO_MAX_VEHICLES: int = 200
    SUMO_TELEMETRY_INTERVAL_S: float = 1.0

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

    @field_validator("DATA_MODE")
    @classmethod
    def validate_data_mode(cls, v: str) -> str:
        v = (v or "live").strip().lower()
        if v not in ("live", "simulation", "test"):
            raise ValueError("DATA_MODE must be one of: live, simulation, test")
        return v

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )


settings = Settings()
