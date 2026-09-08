from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import get_current_user, UserContext, require_permission
from app.core.permissions import Permission
from app.infrastructure.database.session import get_db
from app.network.service import NetworkService

from app.network.schemas import (
    NetworkImportRequest,
    RoadNetworkDTO,
    NetworkNodeDTO,
    NetworkEdgeDTO,
    NetworkStatsResponse,
    ShortestPathRouteRequest,
    ShortestPathRouteResponse,
    NearestNodeRequest,
    NearestNodeResponse,
)

router = APIRouter(prefix="/networks", tags=["Road Network & OSM Module"])


@router.post(
    "/osm/import",
    response_model=NetworkStatsResponse,
    status_code=status.HTTP_201_CREATED,
    dependencies=[Depends(require_permission(Permission.NETWORK_MANAGE))]
)
async def import_osm_network(
    req: NetworkImportRequest,
    user: UserContext = Depends(get_current_user)
):
    """Import OpenStreetMap road network for a configurable city and persist to Supabase."""
    service = NetworkService(db=None)
    try:
        stats = await service.import_osm_network(
            organization_id=user.organization_id,
            city=req.city,
            network_type=req.network_type,
            version=req.version
        )
        return stats
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Failed to import OSM road network for '{req.city}': {str(e)}"
        )


@router.get(
    "",
    response_model=List[RoadNetworkDTO],
    dependencies=[Depends(require_permission(Permission.NETWORK_VIEW))]
)
async def get_networks(
    user: UserContext = Depends(get_current_user)
):
    """List all imported road networks for the authenticated user's organization."""
    service = NetworkService(db=None)
    return await service.get_networks(user.organization_id)


@router.get(
    "/{network_id}",
    response_model=RoadNetworkDTO,
    dependencies=[Depends(require_permission(Permission.NETWORK_VIEW))]
)
async def get_network_by_id(
    network_id: str,
    user: UserContext = Depends(get_current_user)
):
    """Get details of a specific road network."""
    service = NetworkService(db=None)
    net = await service.get_network(network_id, user.organization_id)
    if not net:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Road network not found")
    return net


@router.get(
    "/{network_id}/stats",
    response_model=NetworkStatsResponse,
    dependencies=[Depends(require_permission(Permission.NETWORK_VIEW))]
)
async def get_network_stats(
    network_id: str,
    user: UserContext = Depends(get_current_user)
):
    """Get topological and travel-time weight statistics for a road network."""
    service = NetworkService(db=None)
    try:
        return await service.get_network_stats(network_id, user.organization_id)
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))


@router.get(
    "/{network_id}/nodes",
    response_model=List[NetworkNodeDTO],
    dependencies=[Depends(require_permission(Permission.NETWORK_VIEW))]
)
async def get_network_nodes(
    network_id: str,
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=50, ge=1, le=50000),
    user: UserContext = Depends(get_current_user)
):
    """Get paginated node intersection list for a road network."""
    service = NetworkService(db=None)
    return await service.get_nodes(network_id, page=page, page_size=page_size)


@router.get(
    "/{network_id}/edges",
    response_model=List[NetworkEdgeDTO],
    dependencies=[Depends(require_permission(Permission.NETWORK_VIEW))]
)
async def get_network_edges(
    network_id: str,
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=50, ge=1, le=50000),
    user: UserContext = Depends(get_current_user)
):
    """Get paginated road edge segment list for a road network."""
    service = NetworkService(db=None)
    return await service.get_edges(network_id, page=page, page_size=page_size)


@router.post(
    "/{network_id}/route",
    response_model=ShortestPathRouteResponse,
    dependencies=[Depends(require_permission(Permission.NETWORK_VIEW))]
)
async def calculate_shortest_path_route(
    network_id: str,
    req: ShortestPathRouteRequest,
    user: UserContext = Depends(get_current_user)
):
    """Calculate shortest-path route between source and destination using static free-flow travel time."""
    service = NetworkService(db=None)
    try:
        return await service.calculate_shortest_path(network_id, user.organization_id, req)
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.post(
    "/{network_id}/nearest-node",
    response_model=NearestNodeResponse,
    dependencies=[Depends(require_permission(Permission.NETWORK_VIEW))]
)
async def get_nearest_network_node(
    network_id: str,
    req: NearestNodeRequest,
    user: UserContext = Depends(get_current_user)
):
    """Find the nearest network node to latitude/longitude belonging strictly to the target network."""
    service = NetworkService(db=None)
    try:
        return await service.get_nearest_node(
            network_id=network_id,
            organization_id=user.organization_id,
            lat=req.latitude,
            lng=req.longitude
        )
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


