from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.core.config import settings
from app.core.logging import setup_logging, logger
from app.core.exceptions import QFlowException
from app.api.router import api_router
from app.realtime.manager import router as realtime_ws_router
from app.core.pipeline import pipeline_orchestrator

setup_logging()

app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    description=(
        "Q-FLOW realtime vehicle tracking & dynamic route optimization platform. "
        f"DATA_MODE={settings.DATA_MODE.upper()}: live=real GPS telemetry, "
        "simulation=SUMO (labelled SIMULATION), test=deterministic fixtures."
    ),
    docs_url="/docs",
    redoc_url="/redoc",
    openapi_url="/openapi.json",
)

# Configure CORS Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS + ["*"],
    allow_origin_regex=r"^https?://.*$",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.exception_handler(QFlowException)
async def qflow_exception_handler(request: Request, exc: QFlowException):
    return JSONResponse(
        status_code=exc.status_code,
        content={
            "error": {
                "code": exc.code,
                "message": exc.message,
                "details": exc.details,
            }
        },
    )


@app.on_event("startup")
async def on_startup():
    logger.info("Q-FLOW starting: DATA_MODE=%s", settings.DATA_MODE.upper())
    # Warn loudly if a live deployment lacks the telemetry shared secret.
    if settings.ENVIRONMENT == "production" and not settings.GPS_AUTH_SECRET:
        logger.warning("GPS_AUTH_SECRET is not set — telemetry endpoint is unauthenticated!")
    
    import os
    if not os.getenv("VERCEL") and not os.getenv("VERCEL_ENV"):
        await pipeline_orchestrator.start_workers()
    else:
        logger.info("Serverless environment detected (Vercel) — background worker loops disabled.")


@app.on_event("shutdown")
async def on_shutdown():
    import os
    if not os.getenv("VERCEL") and not os.getenv("VERCEL_ENV"):
        await pipeline_orchestrator.stop_workers()


# Root Welcome & Health Check Endpoints
@app.get("/", tags=["Health"])
@app.get("/health", tags=["Health"])
@app.get("/health/live", tags=["Health"])
@app.get("/health/ready", tags=["Health"])
@app.get("/api/health", tags=["Health"])
async def health_check():
    return {
        "status": "healthy",
        "service": settings.PROJECT_NAME,
        "version": settings.VERSION,
        "environment": settings.ENVIRONMENT,
        "data_mode": settings.DATA_MODE.upper(),
        "docs": "/docs",
        "api_v1": "/api/v1",
    }


# Include API v1 Router
app.include_router(api_router)

# WebSocket realtime channel (/ws/live)
app.include_router(realtime_ws_router)

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True)
