import re
from typing import Any, Union, List, Tuple

# Fallback speed limits in km/h by road type
ROAD_TYPE_FALLBACK_SPEED_KPH = {
    "MOTORWAY": 100.0,
    "MOTORWAY_LINK": 60.0,
    "TRUNK": 80.0,
    "TRUNK_LINK": 50.0,
    "PRIMARY": 60.0,
    "PRIMARY_LINK": 40.0,
    "SECONDARY": 50.0,
    "SECONDARY_LINK": 35.0,
    "TERTIARY": 40.0,
    "TERTIARY_LINK": 30.0,
    "RESIDENTIAL": 30.0,
    "SERVICE": 20.0,
    "UNCLASSIFIED": 30.0,
    "LIVING_STREET": 15.0,
}

# Fallback vehicle capacities by road type
ROAD_TYPE_CAPACITY_VEHICLES = {
    "MOTORWAY": 1000,
    "MOTORWAY_LINK": 500,
    "TRUNK": 800,
    "TRUNK_LINK": 400,
    "PRIMARY": 600,
    "PRIMARY_LINK": 300,
    "SECONDARY": 400,
    "SECONDARY_LINK": 200,
    "TERTIARY": 250,
    "TERTIARY_LINK": 150,
    "RESIDENTIAL": 150,
    "SERVICE": 80,
    "UNCLASSIFIED": 200,
    "LIVING_STREET": 50,
}


def normalize_road_type(raw_highway: Any) -> str:
    """Normalize OSM highway tag (string or list) to uppercase string."""
    if not raw_highway:
        return "UNCLASSIFIED"
    if isinstance(raw_highway, list):
        raw_highway = raw_highway[0]
    highway_str = str(raw_highway).strip().upper()
    return highway_str if highway_str else "UNCLASSIFIED"


def parse_speed_limit(raw_maxspeed: Any, road_type: str) -> Tuple[float, str]:
    """
    Parse OSM maxspeed value (int, float, string, list) into (speed_kph, provenance).
    Returns (speed_kph, "OSM" or "FALLBACK").
    """
    fallback_speed = ROAD_TYPE_FALLBACK_SPEED_KPH.get(road_type, 40.0)

    if raw_maxspeed is None:
        return fallback_speed, "FALLBACK"

    # Handle list of maxspeeds
    if isinstance(raw_maxspeed, list):
        valid_speeds = []
        for val in raw_maxspeed:
            sp, prov = parse_speed_limit(val, road_type)
            if prov == "OSM":
                valid_speeds.append(sp)
        if valid_speeds:
            return float(sum(valid_speeds) / len(valid_speeds)), "OSM"
        return fallback_speed, "FALLBACK"

    # If numeric
    if isinstance(raw_maxspeed, (int, float)):
        val = float(raw_maxspeed)
        return (val if val > 0 else fallback_speed), "OSM"

    speed_str = str(raw_maxspeed).strip().lower()
    if not speed_str:
        return fallback_speed, "FALLBACK"

    # Check for mph
    is_mph = "mph" in speed_str
    
    # Extract numbers
    match = re.search(r"(\d+(\.\d+)?)", speed_str)
    if match:
        val = float(match.group(1))
        if is_mph:
            val = val * 1.60934
        return (val if val > 0 else fallback_speed), "OSM"

    return fallback_speed, "FALLBACK"


def get_road_capacity(road_type: str) -> int:
    """Get vehicle capacity estimate for road type."""
    return ROAD_TYPE_CAPACITY_VEHICLES.get(road_type, 200)


def calculate_static_travel_time(length_meters: float, speed_kph: float) -> float:
    """
    Calculate static free-flow travel time in seconds.
    W_static(e) = length(e) / speed(e)
    """
    if speed_kph <= 0:
        speed_kph = 30.0
    speed_mps = speed_kph / 3.6
    if length_meters <= 0:
        length_meters = 1.0
    return max(0.1, round(length_meters / speed_mps, 3))
