from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field
from datetime import datetime


class NetworkImportRequest(BaseModel):
    city: str = Field(default="Raipur, India", description="City or region name for OSM graph extraction")
    network_type: str = Field(default="drive", description="OSMnx network type filter (drive, walk, bike)")
    version: str = Field(default="v1.0", description="Network dataset version identifier")


class RoadNetworkDTO(BaseModel):
    id: str
    organization_id: str
    name: str
    source: str = "OSM"
    version: str = "v1.0"
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class NetworkNodeDTO(BaseModel):
    id: str
    network_id: str
    external_id: Optional[str] = None
    lat: float
    lng: float

    class Config:
        from_attributes = True


class NetworkEdgeDTO(BaseModel):
    id: str
    network_id: str
    external_id: Optional[str] = None
    from_node_id: Optional[str] = None
    to_node_id: Optional[str] = None
    road_name: str
    length_meters: float
    speed_limit_kph: float
    road_type: str
    capacity_vehicles: int
    geometry: Optional[Dict[str, Any]] = None

    class Config:
        from_attributes = True


class NetworkStatsResponse(BaseModel):
    network_id: str
    name: str
    node_count: int
    edge_count: int
    strongly_connected_components: int
    weakly_connected_components: int
    min_length_meters: float
    max_length_meters: float
    avg_length_meters: float
    min_speed_kph: float
    max_speed_kph: float
    avg_speed_kph: float
    min_travel_time_seconds: float
    max_travel_time_seconds: float
    avg_travel_time_seconds: float
    is_valid: bool = True


class ShortestPathRouteRequest(BaseModel):
    source_lat: Optional[float] = None
    source_lng: Optional[float] = None
    target_lat: Optional[float] = None
    target_lng: Optional[float] = None
    source_node_id: Optional[str] = None
    target_node_id: Optional[str] = None


class ShortestPathRouteResponse(BaseModel):
    network_id: str
    source_node_id: str
    target_node_id: str
    node_path: List[str]
    edge_count: int
    total_distance_meters: float
    total_distance_km: float
    total_travel_time_seconds: float
    total_travel_time_min: float
    path_coordinates: List[List[float]] = []  # List of [lat, lng] pairs
