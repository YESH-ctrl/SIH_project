from fastapi import APIRouter
from app.api.v1.dashboards import router as dashboards_router
from app.api.v1.routes import router as routes_router
from app.api.v1.delivery_points import router as delivery_points_router
from app.api.v1.traffic import router as traffic_router
from app.api.v1.restrictions import router as restrictions_router
from app.api.v1.networks import router as networks_router

api_router = APIRouter(prefix="/api/v1")
api_router.include_router(dashboards_router)
api_router.include_router(routes_router)
api_router.include_router(delivery_points_router)
api_router.include_router(traffic_router)
api_router.include_router(restrictions_router)
api_router.include_router(networks_router)

