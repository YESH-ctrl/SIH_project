from typing import List, Tuple
from app.optimization.models import DepotDTO, DeliveryPointDTO, VehicleSpecDTO

def get_raipur_demo_dataset() -> Tuple[DepotDTO, List[DeliveryPointDTO], List[VehicleSpecDTO]]:
    """
    Deterministic demo dataset in Raipur urban center snapped to OSM graph.
    Network ID: 9cb256c8-6c5a-4f05-8259-e8b887334fa2
    """
    depot = DepotDTO(
        id="depot_central_01",
        name="Raipur Main Distribution Depot",
        latitude=21.2517416,
        longitude=81.629464,
        node_id="f252fd23-643d-5383-ac5b-a61fe339229d"
    )

    delivery_points = [
        DeliveryPointDTO(
            id="dp_01",
            name="Pandri Commercial Hub",
            latitude=21.2575,
            longitude=81.6450,
            demand=12,
            node_id="daa37bf0-8eeb-549e-81d9-ece8f7e469b0"
        ),
        DeliveryPointDTO(
            id="dp_02",
            name="Fafadih Market Complex",
            latitude=21.2560,
            longitude=81.6380,
            demand=15,
            node_id="c0a1b2c3-d4e5-5678-90ab-cdef12345678"  # snapped dynamically if needed
        ),
        DeliveryPointDTO(
            id="dp_03",
            name="Devendra Nagar Logistics Stop",
            latitude=21.2480,
            longitude=81.6420,
            demand=10
        ),
        DeliveryPointDTO(
            id="dp_04",
            name="Shankar Nagar Retail Depot",
            latitude=21.2420,
            longitude=81.6550,
            demand=14
        ),
        DeliveryPointDTO(
            id="dp_05",
            name="Telibandha Express Point",
            latitude=21.2350,
            longitude=81.6620,
            demand=18
        ),
        DeliveryPointDTO(
            id="dp_06",
            name="Civil Lines Admin Delivery",
            latitude=21.2390,
            longitude=81.6370,
            demand=8
        ),
        DeliveryPointDTO(
            id="dp_07",
            name="Pachpedi Naka Distribution",
            latitude=21.2220,
            longitude=81.6490,
            demand=16
        ),
        DeliveryPointDTO(
            id="dp_08",
            name="Tagore Nagar Cargo Point",
            latitude=21.2330,
            longitude=81.6440,
            demand=11
        ),
        DeliveryPointDTO(
            id="dp_09",
            name="Gudhiyari Industrial Stop",
            latitude=21.2580,
            longitude=81.6180,
            demand=15
        ),
        DeliveryPointDTO(
            id="dp_10",
            name="Bhanpuri Freight Hub",
            latitude=21.2720,
            longitude=81.6310,
            demand=20
        ),
    ]

    vehicles = [
        VehicleSpecDTO(
            id="veh_01",
            name="Swarm Alpha (Electric EV-1)",
            capacity=50,
            start_depot_id="depot_central_01",
            color="#00f0ff"  # Neon Cyan
        ),
        VehicleSpecDTO(
            id="veh_02",
            name="Swarm Beta (Heavy Cargo-2)",
            capacity=60,
            start_depot_id="depot_central_01",
            color="#10b981"  # Emerald Green
        ),
        VehicleSpecDTO(
            id="veh_03",
            name="Swarm Gamma (Express Van-3)",
            capacity=50,
            start_depot_id="depot_central_01",
            color="#f59e0b"  # Bright Amber
        ),
    ]

    return depot, delivery_points, vehicles
