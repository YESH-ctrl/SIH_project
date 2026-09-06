from enum import Enum
from typing import Set, Dict


class AppRole(str, Enum):
    SUPER_ADMIN = "SUPER_ADMIN"
    ORG_ADMIN = "ORG_ADMIN"
    OPERATIONS_MANAGER = "OPERATIONS_MANAGER"
    DISPATCHER = "DISPATCHER"
    ANALYST = "ANALYST"
    DRIVER = "DRIVER"


class Permission(str, Enum):
    DASHBOARD_VIEW = "dashboard:view"
    ORGANIZATION_VIEW = "organization:view"
    ORGANIZATION_MANAGE = "organization:manage"
    USERS_VIEW = "users:view"
    USERS_MANAGE = "users:manage"
    FLEET_VIEW = "fleet:view"
    FLEET_MANAGE = "fleet:manage"
    VEHICLES_VIEW = "vehicles:view"
    VEHICLES_MANAGE = "vehicles:manage"
    CUSTOMERS_VIEW = "customers:view"
    CUSTOMERS_MANAGE = "customers:manage"
    DEPOTS_VIEW = "depots:view"
    DEPOTS_MANAGE = "depots:manage"
    ROUTES_VIEW = "routes:view"
    ROUTES_MANAGE = "routes:manage"
    ROUTES_DISPATCH = "routes:dispatch"
    TRAFFIC_VIEW = "traffic:view"
    INCIDENTS_VIEW = "incidents:view"
    INCIDENTS_MANAGE = "incidents:manage"
    OPTIMIZATION_VIEW = "optimization:view"
    OPTIMIZATION_START = "optimization:start"
    REOPTIMIZATION_VIEW = "reoptimization:view"
    REOPTIMIZATION_START = "reoptimization:start"
    SIMULATION_VIEW = "simulation:view"
    SIMULATION_MANAGE = "simulation:manage"
    ANALYTICS_VIEW = "analytics:view"
    BENCHMARKS_VIEW = "benchmarks:view"
    NETWORK_VIEW = "network:view"
    NETWORK_MANAGE = "network:manage"
    RESTRICTIONS_VIEW = "restrictions:view"
    RESTRICTIONS_MANAGE = "restrictions:manage"
    REPORTS_VIEW = "reports:view"
    REPORTS_EXPORT = "reports:export"


ROLE_PERMISSIONS: Dict[AppRole, Set[Permission]] = {
    AppRole.SUPER_ADMIN: set(Permission),
    AppRole.ORG_ADMIN: {
        Permission.DASHBOARD_VIEW, Permission.ORGANIZATION_VIEW, Permission.ORGANIZATION_MANAGE,
        Permission.USERS_VIEW, Permission.USERS_MANAGE, Permission.FLEET_VIEW, Permission.FLEET_MANAGE,
        Permission.VEHICLES_VIEW, Permission.VEHICLES_MANAGE, Permission.CUSTOMERS_VIEW, Permission.CUSTOMERS_MANAGE,
        Permission.DEPOTS_VIEW, Permission.DEPOTS_MANAGE, Permission.ROUTES_VIEW, Permission.ROUTES_MANAGE,
        Permission.TRAFFIC_VIEW, Permission.INCIDENTS_VIEW, Permission.OPTIMIZATION_VIEW,
        Permission.ANALYTICS_VIEW, Permission.BENCHMARKS_VIEW, Permission.NETWORK_VIEW, Permission.NETWORK_MANAGE,
        Permission.RESTRICTIONS_VIEW, Permission.RESTRICTIONS_MANAGE, Permission.REPORTS_VIEW, Permission.REPORTS_EXPORT,
    },
    AppRole.OPERATIONS_MANAGER: {
        Permission.DASHBOARD_VIEW, Permission.FLEET_VIEW, Permission.FLEET_MANAGE,
        Permission.VEHICLES_VIEW, Permission.VEHICLES_MANAGE, Permission.CUSTOMERS_VIEW, Permission.DEPOTS_VIEW,
        Permission.ROUTES_VIEW, Permission.ROUTES_MANAGE, Permission.ROUTES_DISPATCH,
        Permission.TRAFFIC_VIEW, Permission.INCIDENTS_VIEW, Permission.INCIDENTS_MANAGE,
        Permission.OPTIMIZATION_VIEW, Permission.OPTIMIZATION_START, Permission.REOPTIMIZATION_VIEW,
        Permission.REOPTIMIZATION_START, Permission.SIMULATION_VIEW, Permission.SIMULATION_MANAGE,
        Permission.ANALYTICS_VIEW, Permission.BENCHMARKS_VIEW, Permission.NETWORK_VIEW,
        Permission.RESTRICTIONS_VIEW, Permission.REPORTS_VIEW, Permission.REPORTS_EXPORT,
    },
    AppRole.DISPATCHER: {
        Permission.DASHBOARD_VIEW, Permission.FLEET_VIEW, Permission.VEHICLES_VIEW,
        Permission.ROUTES_VIEW, Permission.ROUTES_DISPATCH, Permission.TRAFFIC_VIEW,
        Permission.INCIDENTS_VIEW, Permission.INCIDENTS_MANAGE, Permission.REOPTIMIZATION_VIEW,
        Permission.REOPTIMIZATION_START, Permission.SIMULATION_VIEW, Permission.NETWORK_VIEW,
    },
    AppRole.ANALYST: {
        Permission.DASHBOARD_VIEW, Permission.FLEET_VIEW, Permission.ROUTES_VIEW,
        Permission.TRAFFIC_VIEW, Permission.INCIDENTS_VIEW, Permission.OPTIMIZATION_VIEW,
        Permission.ANALYTICS_VIEW, Permission.BENCHMARKS_VIEW, Permission.NETWORK_VIEW,
        Permission.REPORTS_VIEW, Permission.REPORTS_EXPORT,
    },
    AppRole.DRIVER: {
        Permission.DASHBOARD_VIEW, Permission.ROUTES_VIEW,
    },
}


def has_permission(role: AppRole, permission: Permission) -> bool:
    role_perms = ROLE_PERMISSIONS.get(role, set())
    return permission in role_perms
