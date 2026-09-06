export type AppRole =
  | "SUPER_ADMIN"
  | "ORG_ADMIN"
  | "OPERATIONS_MANAGER"
  | "DISPATCHER"
  | "ANALYST"
  | "DRIVER";

export type Permission =
  | "dashboard:view"
  | "fleet:view"
  | "fleet:manage"
  | "vehicles:view"
  | "vehicles:manage"
  | "customers:view"
  | "customers:manage"
  | "depots:view"
  | "depots:manage"
  | "routes:view"
  | "routes:manage"
  | "routes:dispatch"
  | "traffic:view"
  | "incidents:view"
  | "incidents:manage"
  | "optimization:view"
  | "optimization:start"
  | "reoptimization:view"
  | "reoptimization:start"
  | "simulation:view"
  | "simulation:manage"
  | "analytics:view"
  | "benchmarks:view"
  | "network:view"
  | "network:manage"
  | "restrictions:view"
  | "restrictions:manage"
  | "users:view"
  | "users:manage"
  | "organization:view"
  | "organization:manage"
  | "reports:view"
  | "reports:export";

export const ROLE_PERMISSIONS: Record<AppRole, Permission[]> = {
  SUPER_ADMIN: [
    "dashboard:view", "fleet:view", "fleet:manage", "vehicles:view", "vehicles:manage",
    "customers:view", "customers:manage", "depots:view", "depots:manage", "routes:view",
    "routes:manage", "routes:dispatch", "traffic:view", "incidents:view", "incidents:manage",
    "optimization:view", "optimization:start", "reoptimization:view", "reoptimization:start",
    "simulation:view", "simulation:manage", "analytics:view", "benchmarks:view",
    "network:view", "network:manage", "restrictions:view", "restrictions:manage",
    "users:view", "users:manage", "organization:view", "organization:manage",
    "reports:view", "reports:export",
  ],

  ORG_ADMIN: [
    "dashboard:view", "fleet:view", "fleet:manage", "vehicles:view", "vehicles:manage",
    "customers:view", "customers:manage", "depots:view", "depots:manage", "routes:view",
    "routes:manage", "routes:dispatch", "traffic:view", "incidents:view", "incidents:manage",
    "optimization:view", "optimization:start", "reoptimization:view", "reoptimization:start",
    "simulation:view", "simulation:manage", "analytics:view", "benchmarks:view",
    "network:view", "network:manage", "restrictions:view", "restrictions:manage",
    "users:view", "users:manage", "organization:view", "organization:manage",
    "reports:view", "reports:export",
  ],

  OPERATIONS_MANAGER: [
    "dashboard:view", "fleet:view", "fleet:manage", "vehicles:view", "vehicles:manage",
    "customers:view", "depots:view", "routes:view", "routes:manage", "routes:dispatch",
    "traffic:view", "incidents:view", "incidents:manage", "optimization:view",
    "optimization:start", "reoptimization:view", "reoptimization:start", "simulation:view",
    "simulation:manage", "analytics:view", "benchmarks:view", "network:view",
    "restrictions:view", "reports:view", "reports:export",
  ],

  DISPATCHER: [
    "dashboard:view", "fleet:view", "vehicles:view", "routes:view", "routes:dispatch",
    "traffic:view", "incidents:view", "incidents:manage", "optimization:view",
    "reoptimization:view", "reoptimization:start", "simulation:view", "network:view",
  ],

  ANALYST: [
    "dashboard:view", "fleet:view", "vehicles:view", "routes:view", "traffic:view",
    "incidents:view", "optimization:view", "analytics:view", "benchmarks:view",
    "network:view", "reports:view", "reports:export",
  ],

  DRIVER: [
    "dashboard:view", "routes:view", "incidents:view",
  ],
};

export function hasRolePermission(role: AppRole | undefined, permission: Permission): boolean {
  if (!role) return false;
  const perms = ROLE_PERMISSIONS[role];
  return perms ? perms.includes(permission) : false;
}
