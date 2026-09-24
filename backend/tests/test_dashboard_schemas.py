import pytest
from app.schemas.dashboard import (
    AdminDashboardResponse,
    OperationsDashboardResponse,
    DispatcherDashboardResponse,
    AnalystDashboardResponse,
    RoleDistributionItem,
    IncidentSummary,
    OptimizationSummary,
    PriorityActionItem,
    CriticalIncidentItem,
    ActiveRouteItem,
    ActivityFeedItem,
    AlgorithmBenchmarkItem,
    QpsoAnalytics,
)


def test_admin_dashboard_schema():
    resp = AdminDashboardResponse(
        organization_name="SIH 2026 Fleet Operations",
        total_vehicles=40,
        active_vehicles=32,
        total_delivery_points=300,
        active_routes=28,
        avg_utilization=84.2,
        network_congestion=38.0,
        completed_deliveries_today=248,
        system_health_percent=99.8,
        role_distribution=[
            RoleDistributionItem(role="Operations Managers", count=4, color="#38bdf8")
        ],
        fleet_health={"active": 32, "idle": 5, "maintenance": 3},
        operations_summary={"completed": 248},
        network_health={"congestionPercent": 38.0},
        users_overview={"total": 23},
        recent_activity=[{"id": "1", "title": "Test Activity"}],
    )
    assert resp.total_vehicles == 40
    assert resp.organization_name == "SIH 2026 Fleet Operations"


def test_operations_dashboard_schema():
    resp = OperationsDashboardResponse(
        active_vehicles=40,
        active_routes=40,
        delivery_stops=300,
        network_congestion=38.0,
        avg_speed_kmh=32.0,
        on_time_delivery_percent=94.2,
        delayed_routes_count=4,
        optimization_status="OPTIMIZATION READY",
        operational_health={"onSchedule": 34},
        latest_incident=IncidentSummary(
            code="E17",
            location="Express E17",
            delay_increase_percent=78.0,
            affected_vehicles=6,
            affected_routes=4,
            severity="High",
        ),
        current_optimization=OptimizationSummary(
            run_id="RUN-101",
            algorithm="QPSO",
            vehicle_count=40,
            stop_count=300,
            progress_percent=100.0,
            best_fitness=1240.8,
            status="COMPLETED",
            last_run_time="08:40 AM",
        ),
        priority_actions=[
            PriorityActionItem(
                id="pa_1",
                title="6 Vehicles Affected",
                urgency="HIGH",
                count=6,
                action_label="Reoptimize",
                target_tab="reoptimization",
            )
        ],
    )
    assert resp.active_vehicles == 40
    assert resp.latest_incident.code == "E17"
