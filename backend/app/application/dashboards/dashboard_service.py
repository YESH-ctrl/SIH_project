import logging
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import CurrentUser
from app.infrastructure.database.repositories.dashboard_repository import DashboardRepository
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

logger = logging.getLogger("qflow.dashboard_service")


class DashboardService:
    def __init__(self, db: AsyncSession):
        self.db = db
        self.repo = DashboardRepository(db)

    async def get_admin_dashboard(self, user: CurrentUser) -> AdminDashboardResponse:
        metrics = await self.repo.get_admin_metrics(user.organization_id)
        
        return AdminDashboardResponse(
            organization_name="SIH 2026 Fleet Operations",
            total_vehicles=metrics.get("total_vehicles", 40),
            active_vehicles=metrics.get("active_vehicles", 32),
            total_delivery_points=300,
            active_routes=28,
            avg_utilization=84.2,
            network_congestion=38.0,
            completed_deliveries_today=248,
            system_health_percent=metrics.get("system_health", 99.8),
            role_distribution=[
                RoleDistributionItem(role="Operations Managers", count=4, color="#38bdf8"),
                RoleDistributionItem(role="Dispatchers", count=12, color="#a855f7"),
                RoleDistributionItem(role="Analysts", count=5, color="#f59e0b"),
                RoleDistributionItem(role="Org Admins", count=2, color="#10b981"),
            ],
            fleet_health={"active": 32, "idle": 5, "maintenance": 3},
            operations_summary={
                "completed": 248,
                "inProgress": 28,
                "delayed": 4,
                "exceptions": 2,
                "avgTimeMin": 34.5,
            },
            network_health={
                "congestionPercent": 38.0,
                "avgSpeedKmh": 32.0,
                "majorEventsCount": 1,
                "affectedZones": ["Zone 3 Express", "Rajpur Central Corridor"],
                "optimizationStatus": "OPTIMIZED",
            },
            users_overview={
                "total": metrics.get("total_users", 23),
                "opsManagers": 4,
                "dispatchers": 12,
                "analysts": 5,
                "recentUsers": metrics.get("recent_users") if metrics.get("recent_users") else [
                    {"name": "Sienna Miller", "email": "dispatcher@qswarm.io", "role": "DISPATCHER", "date": "Today, 08:15"},
                    {"name": "Commander Sarah Jenkins", "email": "ops@qswarm.io", "role": "OPERATIONS_MANAGER", "date": "Yesterday, 16:40"},
                    {"name": "Marcus Sterling", "email": "analyst@qswarm.io", "role": "ANALYST", "date": "2 days ago"},
                ],
            },
            recent_activity=[
                {"id": "act_1", "time": "08:40 AM", "type": "OPTIMIZATION", "title": "QPSO Fleet Optimization Completed", "desc": "Saved 18.4% travel time across 40 vehicles"},
                {"id": "act_2", "time": "08:25 AM", "type": "INCIDENT", "title": "Traffic Event Detected on E17", "desc": "Accident reported on Express E17 (+78% delay)"},
                {"id": "act_3", "time": "08:10 AM", "type": "USER", "title": "User Account Provisioned", "desc": "Sienna Miller assigned DISPATCHER role"},
            ],
        )

    async def get_operations_dashboard(self, user: CurrentUser) -> OperationsDashboardResponse:
        metrics = await self.repo.get_operations_metrics(user.organization_id)

        return OperationsDashboardResponse(
            active_vehicles=metrics["active_vehicles"],
            active_routes=metrics["active_routes"],
            delivery_stops=metrics["delivery_stops"],
            network_congestion=metrics["network_congestion_percent"],
            avg_speed_kmh=metrics["avg_speed_kmh"],
            on_time_delivery_percent=metrics["on_time_delivery_percent"],
            delayed_routes_count=metrics["delayed_routes"],
            optimization_status=metrics["optimization_status"],
            operational_health={"onSchedule": 34, "delayed": 4, "idle": 2, "atRisk": 3, "exceptions": 1},
            latest_incident=IncidentSummary(
                code="E17",
                location="Rajpur Express E17",
                delay_increase_percent=78.0,
                affected_vehicles=6,
                affected_routes=4,
                severity="High",
            ),
            current_optimization=OptimizationSummary(
                run_id="QPSO-RUN-8942",
                algorithm="QPSO (Quantum Swarm)",
                vehicle_count=40,
                stop_count=300,
                progress_percent=100.0,
                best_fitness=1240.8,
                status="COMPLETED",
                last_run_time="08:40 AM",
            ),
            priority_actions=[
                PriorityActionItem(id="pa_1", title="6 Vehicles Affected by E17 Incident", urgency="HIGH", count=6, action_label="Trigger Reoptimization", target_tab="reoptimization"),
                PriorityActionItem(id="pa_2", title="4 Routes Delayed > 15 Minutes", urgency="MEDIUM", count=4, action_label="Review Delayed Routes", target_tab="route-monitor"),
            ],
        )

    async def get_dispatcher_dashboard(self, user: CurrentUser) -> DispatcherDashboardResponse:
        metrics = await self.repo.get_dispatcher_metrics(user.organization_id)

        return DispatcherDashboardResponse(
            vehicles_online=metrics["vehicles_online"],
            vehicles_moving=metrics["vehicles_moving"],
            vehicles_idle=metrics["vehicles_idle"],
            active_routes=metrics["active_routes"],
            delayed_routes=metrics["delayed_routes"],
            critical_incidents_count=metrics["critical_incidents_count"],
            critical_incidents=[
                CriticalIncidentItem(
                    id="inc_01",
                    code="E17",
                    location="Express E17 (KM 14.2)",
                    delay_text="+78% Delay",
                    vehicles_affected=6,
                    severity="CRITICAL",
                )
            ],
            active_routes_list=[
                ActiveRouteItem(id="r_101", route_code="R-007", vehicle_code="VH-007", driver="Vikram Singh", next_stop="Stop #14 (Civil Lines)", eta="09:12 AM", delay_min=18, status="DELAYED"),
                ActiveRouteItem(id="r_102", route_code="R-012", vehicle_code="VH-012", driver="Amit Sharma", next_stop="Stop #08 (Industrial Hub)", eta="08:58 AM", delay_min=0, status="ON_TIME"),
            ],
            delivery_exceptions=[
                {"id": "ex_1", "type": "Road Blocked", "details": "E17 Construction Hazard at Junction 4", "status": "Active", "time": "08:35 AM"}
            ],
            realtime_activity_feed=[
                ActivityFeedItem(id="f_1", time="08:44:12", text="Vehicle VH-023 successfully completed rerouting around E17 hazard", category="VEHICLE"),
                ActivityFeedItem(id="f_2", time="08:42:05", text="Dispatch Reoptimization trigger initiated by Operator", category="DISPATCH"),
            ],
        )

    async def get_analyst_dashboard(self, user: CurrentUser) -> AnalystDashboardResponse:
        metrics = await self.repo.get_analyst_metrics(user.organization_id)

        return AnalystDashboardResponse(
            avg_travel_time_min=metrics["avg_travel_time_min"],
            avg_route_distance_km=metrics["avg_route_distance_km"],
            on_time_delivery_percent=metrics["on_time_delivery_percent"],
            avg_network_congestion_percent=metrics["avg_network_congestion_percent"],
            fleet_utilization_percent=metrics["fleet_utilization_percent"],
            optimization_improvement_percent=metrics["optimization_improvement_percent"],
            avg_optimization_time_sec=metrics["avg_optimization_time_sec"],
            reoptimization_count=metrics["reoptimization_count"],
            algorithm_benchmarks=[
                AlgorithmBenchmarkItem(algorithm="QPSO (Quantum Swarm)", best_fitness=1240.8, avg_fitness=1255.4, travel_time_saved_percent=18.4, avg_distance_km=18.6, avg_runtime_sec=2.1, convergence_rate="Rapid (Iter 35)"),
                AlgorithmBenchmarkItem(algorithm="Standard PSO", best_fitness=1420.1, avg_fitness=1460.8, travel_time_saved_percent=12.1, avg_distance_km=21.2, avg_runtime_sec=6.4, convergence_rate="Moderate (Iter 85)"),
                AlgorithmBenchmarkItem(algorithm="Genetic Algorithm (GA)", best_fitness=1390.5, avg_fitness=1435.2, travel_time_saved_percent=13.5, avg_distance_km=20.4, avg_runtime_sec=12.8, convergence_rate="Slow (Iter 140)"),
            ],
            qpso_analytics=QpsoAnalytics(
                convergence_curve=[
                    {"iteration": 0, "qpso": 2400, "ga": 2400, "pso": 2400},
                    {"iteration": 10, "qpso": 1850, "ga": 2100, "pso": 2050},
                    {"iteration": 20, "qpso": 1450, "ga": 1800, "pso": 1720},
                    {"iteration": 30, "qpso": 1280, "ga": 1600, "pso": 1550},
                    {"iteration": 40, "qpso": 1245, "ga": 1480, "pso": 1460},
                    {"iteration": 50, "qpso": 1240.8, "ga": 1410, "pso": 1430},
                ],
                best_fitness=1240.8,
                population_size=50,
                iterations=50,
                runtime_sec=2.1,
            ),
            traffic_analytics={
                "congestionByZone": [
                    {"zone": "Zone 1 (North)", "congestion": 24},
                    {"zone": "Zone 2 (Central)", "congestion": 48},
                    {"zone": "Zone 3 (Express E17)", "congestion": 82},
                ],
                "peakDelayWindows": ["08:00 - 09:30 AM", "05:00 - 06:30 PM"],
            },
            optimization_history=[
                {"runId": "QPSO-RUN-8942", "date": "Today, 08:40 AM", "algorithm": "QPSO", "vehicles": 40, "stops": 300, "fitness": 1240.8, "runtimeSec": 2.1, "status": "Completed"}
            ],
        )
