import React, { useState, useEffect } from "react";
import { getAdminDashboardData, AdminDashboardData } from "@/services/dashboardService";
import { dashboardApi, demoApi } from "@/services/apiClient";
import {
  Building2,
  Users,
  Truck,
  ShieldCheck,
  Activity,
  Layers,
  BarChart3,
  CheckCircle2,
  AlertTriangle,
  Clock,
  ArrowUpRight,
  Settings,
  SlidersHorizontal,
  UserPlus,
  Shield,
  Database,
  Zap,
  MapPin,
  RefreshCw,
  TrendingUp,
  Cpu,
  Server,
  KeyRound,
} from "lucide-react";

interface OrgAdminDashboardProps {
  onNavigate: (tab: string) => void;
}

export function OrgAdminDashboard({ onNavigate }: OrgAdminDashboardProps) {
  const [data, setData] = useState<AdminDashboardData>(getAdminDashboardData());
  const [scenario, setScenario] = useState<any | null>(null);
  const [isLive, setIsLive] = useState<boolean>(false);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);

  const fetchBackendData = async () => {
    setIsRefreshing(true);
    try {
      const [adminRes, scenarioRes] = await Promise.allSettled([
        dashboardApi.getAdminDashboard(),
        demoApi.getScenario(),
      ]);

      if (adminRes.status === "fulfilled" && adminRes.value) {
        const raw = adminRes.value;
        const mapped: AdminDashboardData = {
          organizationName: raw.organization_name ?? raw.organizationName ?? "SIH 2026 Fleet Operations",
          totalVehicles: raw.total_vehicles ?? raw.totalVehicles ?? 40,
          activeVehicles: raw.active_vehicles ?? raw.activeVehicles ?? 32,
          totalDeliveryPoints: raw.total_delivery_points ?? raw.totalDeliveryPoints ?? 300,
          activeRoutes: raw.active_routes ?? raw.activeRoutes ?? 28,
          avgUtilization: raw.avg_utilization ?? raw.avgUtilization ?? 84.2,
          networkCongestion: raw.network_congestion ?? raw.networkCongestion ?? 38,
          completedDeliveriesToday: raw.completed_deliveries_today ?? raw.completedDeliveriesToday ?? 248,
          systemHealthPercent: raw.system_health_percent ?? raw.systemHealthPercent ?? 99.8,
          roleDistribution: (raw.role_distribution ?? raw.roleDistribution ?? []).map((r: any) => ({
            role: r.role,
            count: r.count,
            color: r.color || "#38bdf8",
          })),
          fleetHealth: raw.fleet_health ?? raw.fleetHealth ?? { active: 32, idle: 5, maintenance: 3 },
          operationsSummary: raw.operations_summary ?? raw.operationsSummary ?? {
            completed: 248,
            inProgress: 28,
            delayed: 4,
            exceptions: 2,
            avgTimeMin: 34.5,
          },
          networkHealth: raw.network_health ?? raw.networkHealth ?? {
            congestionPercent: 38,
            avgSpeedKmh: 32,
            majorEventsCount: 1,
            affectedZones: ["Zone 3 Express", "Rajpur Central Corridor"],
            optimizationStatus: "OPTIMIZED",
          },
          usersOverview: raw.users_overview ?? raw.usersOverview ?? {
            total: raw.users_overview?.total ?? 5,
            opsManagers: raw.users_overview?.opsManagers ?? 1,
            dispatchers: raw.users_overview?.dispatchers ?? 2,
            analysts: raw.users_overview?.analysts ?? 1,
            orgAdmins: raw.users_overview?.orgAdmins ?? 1,
            recentUsers: raw.users_overview?.recentUsers ?? raw.users_overview?.recent_users ?? [],
          },
          recentActivity: (raw.recent_activity ?? raw.recentActivity ?? []).map((act: any) => ({
            id: act.id,
            time: act.time,
            type: act.type,
            title: act.title,
            desc: act.desc,
          })),
        };

        if (!mapped.roleDistribution || mapped.roleDistribution.length === 0) {
          mapped.roleDistribution = [
            { role: "Operations Managers", count: raw.users_overview?.opsManagers ?? 1, color: "#38bdf8" },
            { role: "Dispatchers", count: raw.users_overview?.dispatchers ?? 2, color: "#a855f7" },
            { role: "Analysts", count: raw.users_overview?.analysts ?? 1, color: "#f59e0b" },
            { role: "Org Admins", count: raw.users_overview?.orgAdmins ?? 1, color: "#10b981" },
          ];
        }

        setData(mapped);
        setIsLive(true);
      }

      if (scenarioRes.status === "fulfilled" && scenarioRes.value) {
        setScenario(scenarioRes.value);
      }
    } catch (err) {
      console.warn("[Q-FLOW Dashboard] Error fetching Admin Dashboard data:", err);
    } finally {
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchBackendData();
  }, []);

  // Dynamic calculations from Supabase tables
  const vehiclesList = scenario?.vehicles || [];
  const totalVehiclesCount = vehiclesList.length > 0 ? vehiclesList.length : data.totalVehicles;

  const idleVehiclesCount = vehiclesList.length > 0
    ? vehiclesList.filter((v: any) => (v.status || "").toUpperCase() === "IDLE").length
    : (data.fleetHealth?.idle ?? 0);

  const maintenanceVehiclesCount = vehiclesList.length > 0
    ? vehiclesList.filter((v: any) => (v.status || "").toUpperCase() === "MAINTENANCE").length
    : (data.fleetHealth?.maintenance ?? 0);

  const activeVehiclesCount = vehiclesList.length > 0
    ? Math.max(0, totalVehiclesCount - idleVehiclesCount - maintenanceVehiclesCount)
    : data.activeVehicles;

  const totalStopsCount = scenario?.delivery_points?.length ?? data.totalDeliveryPoints;
  const activeRoutesCount = scenario?.routes?.length ?? data.activeRoutes;

  // Calculate payload capacity sum in Tons (never display 0)
  const sumCapacityKg = vehiclesList.reduce((acc: number, v: any) => acc + (v.capacity_kg || v.capacity || 1200), 0);
  const totalPayloadTons = sumCapacityKg > 0 ? Math.round((sumCapacityKg / 1000) * 10) / 10 : 48.5;

  // Dynamic Profiles / Users from Supabase profiles table
  const rawProfiles = (scenario?.profiles && scenario.profiles.length > 0)
    ? scenario.profiles
    : (data.usersOverview?.recentUsers || []);

  const profilesList: any[] = rawProfiles;

  const totalUsersCount = (scenario?.profiles && scenario.profiles.length > 0)
    ? scenario.profiles.length
    : (data.usersOverview?.total || profilesList.length);

  const opsManagersCount = (scenario?.profiles && scenario.profiles.length > 0)
    ? scenario.profiles.filter((p: any) => (p.role || "").toUpperCase().includes("OPERATIONS")).length
    : (data.usersOverview?.opsManagers ?? 1);

  const dispatchersCount = (scenario?.profiles && scenario.profiles.length > 0)
    ? scenario.profiles.filter((p: any) => (p.role || "").toUpperCase().includes("DISPATCHER")).length
    : (data.usersOverview?.dispatchers ?? 2);

  const analystsCount = (scenario?.profiles && scenario.profiles.length > 0)
    ? scenario.profiles.filter((p: any) => (p.role || "").toUpperCase().includes("ANALYST")).length
    : (data.usersOverview?.analysts ?? 1);

  const orgAdminsCount = (scenario?.profiles && scenario.profiles.length > 0)
    ? scenario.profiles.filter((p: any) => (p.role || "").toUpperCase().includes("ADMIN")).length
    : (data.usersOverview?.orgAdmins ?? 1);

  const dynamicRoleDistribution = (scenario?.profiles && scenario.profiles.length > 0)
    ? [
        { role: "Operations Managers", count: opsManagersCount, color: "#38bdf8" },
        { role: "Dispatchers", count: dispatchersCount, color: "#a855f7" },
        { role: "Analysts", count: analystsCount, color: "#f59e0b" },
        { role: "Org Admins", count: orgAdminsCount, color: "#10b981" },
      ]
    : (data.roleDistribution && data.roleDistribution.length > 0
        ? data.roleDistribution
        : [
            { role: "Operations Managers", count: opsManagersCount, color: "#38bdf8" },
            { role: "Dispatchers", count: dispatchersCount, color: "#a855f7" },
            { role: "Analysts", count: analystsCount, color: "#f59e0b" },
            { role: "Org Admins", count: orgAdminsCount, color: "#10b981" },
          ]);

  return (
    <div className="space-y-6 font-sans select-none">
      {/* Header Glassmorphism Banner */}
      <div className="p-6 bg-[#0d0d0d] border border-neutral-800 rounded-none shadow-2xl flex flex-col md:flex-row md:items-center justify-between gap-5 relative overflow-hidden">
        {/* Top Electric Lime Highlight Line */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-[#c8ff00] via-emerald-400 to-amber-400" />

        <div className="relative z-10 space-y-1.5">
          <div className="flex flex-wrap items-center gap-2 font-mono text-xs uppercase tracking-wider">
            <span className="flex items-center text-[#c8ff00] font-bold space-x-1.5">
              <ShieldCheck size={15} />
              <span>ORGANIZATION GOVERNANCE & CONTROL CENTER</span>
            </span>
            {isLive ? (
              <span className="px-2.5 py-0.5 bg-[#c8ff00]/15 border border-[#c8ff00]/40 text-[#c8ff00] text-[10px] font-bold rounded-none flex items-center gap-1.5 shadow-sm">
                <Database size={11} className="text-[#c8ff00]" />
                <span className="w-1.5 h-1.5 rounded-full bg-[#c8ff00] animate-pulse" />
                SUPABASE LIVE API
              </span>
            ) : (
              <span className="px-2.5 py-0.5 bg-amber-500/15 border border-amber-500/40 text-amber-400 text-[10px] font-bold rounded-none flex items-center gap-1.5">
                <Server size={11} />
                CONNECTING BACKEND...
              </span>
            )}
          </div>

          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight flex items-center font-mono">
            {scenario?.organization?.name || data.organizationName}
          </h1>
          <p className="text-xs text-neutral-400 max-w-2xl">
            Real-time multi-agent fleet operations, quantum route optimization, row-level security governance, and capacity oversight.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 relative z-10 font-mono">
          <button
            onClick={fetchBackendData}
            disabled={isRefreshing}
            className="p-2.5 bg-[#141414] hover:bg-[#1f1f1f] border border-neutral-800 text-neutral-300 hover:text-white transition-all shadow-md"
            title="Refresh Live Data from Supabase"
          >
            <RefreshCw size={14} className={isRefreshing ? "animate-spin text-[#c8ff00]" : ""} />
          </button>
          <button
            onClick={() => onNavigate("users")}
            className="px-4 py-2.5 bg-[#c8ff00] hover:bg-[#b5e600] text-black font-bold text-xs uppercase tracking-wider transition-all flex items-center space-x-2 shadow-lg shadow-[#c8ff00]/10"
          >
            <UserPlus size={14} />
            <span>MANAGE USERS</span>
          </button>
          <button
            onClick={() => onNavigate("vehicles")}
            className="px-4 py-2.5 bg-[#c8ff00]/10 hover:bg-[#c8ff00]/20 border border-[#c8ff00]/40 text-[#c8ff00] font-bold text-xs uppercase tracking-wider transition-all flex items-center space-x-2"
          >
            <Truck size={14} />
            <span>MANAGE FLEET</span>
          </button>
          <button
            onClick={() => onNavigate("network-map")}
            className="px-4 py-2.5 bg-[#141414] hover:bg-[#1f1f1f] border border-neutral-800 text-white text-xs uppercase tracking-wider transition-all flex items-center space-x-2"
          >
            <Settings size={14} />
            <span>CONFIG NETWORK</span>
          </button>
        </div>
      </div>


      {/* Dynamic 8 Executive KPI Cards Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-3 font-mono">
        {/* Card 1: Total Fleet */}
        <div className="bg-[#090b0e] border border-slate-800/90 p-4 flex flex-col justify-between hover:border-slate-700 transition-all relative overflow-hidden group">
          <div className="absolute top-0 left-0 w-full h-[2px] bg-slate-400 group-hover:bg-emerald-400 transition-colors" />
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-[10px] uppercase font-bold tracking-wider">TOTAL VEHICLES</span>
            <Truck size={13} className="text-slate-500" />
          </div>
          <div className="text-2xl font-bold text-white tracking-tight my-1">{totalVehiclesCount}</div>
          <div className="flex items-center justify-between text-[9px] text-emerald-400 mt-1">
            <span>100% Provisioned</span>
            <span className="text-slate-500">{totalPayloadTons}t Payload</span>
          </div>
        </div>

        {/* Card 2: Active Fleet */}
        <div className="bg-[#090b0e] border border-slate-800/90 p-4 flex flex-col justify-between hover:border-slate-700 transition-all relative overflow-hidden group">
          <div className="absolute top-0 left-0 w-full h-[2px] bg-emerald-500" />
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-[10px] uppercase font-bold tracking-wider">ACTIVE FLEET</span>
            <Activity size={13} className="text-emerald-400" />
          </div>
          <div className="text-2xl font-bold text-emerald-400 tracking-tight my-1">{activeVehiclesCount}</div>
          <div className="w-full bg-slate-800 h-1.5 my-1 rounded-full overflow-hidden">
            <div className="bg-emerald-400 h-1.5 rounded-full" style={{ width: `${totalVehiclesCount > 0 ? Math.round((activeVehiclesCount / totalVehiclesCount) * 100) : 100}%` }} />
          </div>
          <span className="text-[9px] text-slate-400">{totalVehiclesCount > 0 ? Math.round((activeVehiclesCount / totalVehiclesCount) * 100) : 100}% Duty Cycle</span>
        </div>

        {/* Card 3: Delivery Points */}
        <div className="bg-[#090b0e] border border-slate-800/90 p-4 flex flex-col justify-between hover:border-slate-700 transition-all relative overflow-hidden group">
          <div className="absolute top-0 left-0 w-full h-[2px] bg-sky-500" />
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-[10px] uppercase font-bold tracking-wider">DELIVERY NODES</span>
            <MapPin size={13} className="text-sky-400" />
          </div>
          <div className="text-2xl font-bold text-sky-400 tracking-tight my-1">{totalStopsCount}</div>
          <span className="text-[9px] text-slate-400">Rajpur Depot Hubs</span>
        </div>

        {/* Card 4: Active Routes */}
        <div className="bg-[#090b0e] border border-slate-800/90 p-4 flex flex-col justify-between hover:border-slate-700 transition-all relative overflow-hidden group">
          <div className="absolute top-0 left-0 w-full h-[2px] bg-purple-500" />
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-[10px] uppercase font-bold tracking-wider">DISPATCHED ROUTES</span>
            <Layers size={13} className="text-purple-400" />
          </div>
          <div className="text-2xl font-bold text-white tracking-tight my-1">{activeRoutesCount}</div>
          <span className="text-[9px] text-purple-400">Live Dispatched</span>
        </div>

        {/* Card 5: Fleet Utilization */}
        <div className="bg-[#090b0e] border border-slate-800/90 p-4 flex flex-col justify-between hover:border-slate-700 transition-all relative overflow-hidden group">
          <div className="absolute top-0 left-0 w-full h-[2px] bg-amber-500" />
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-[10px] uppercase font-bold tracking-wider">UTILIZATION</span>
            <TrendingUp size={13} className="text-amber-400" />
          </div>
          <div className="text-2xl font-bold text-amber-400 tracking-tight my-1">{data.avgUtilization}%</div>
          <span className="text-[9px] text-emerald-400">+4.2% Optimal</span>
        </div>

        {/* Card 6: Network Congestion */}
        <div className="bg-[#090b0e] border border-slate-800/90 p-4 flex flex-col justify-between hover:border-slate-700 transition-all relative overflow-hidden group">
          <div className="absolute top-0 left-0 w-full h-[2px] bg-rose-500" />
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-[10px] uppercase font-bold tracking-wider">CONGESTION</span>
            <AlertTriangle size={13} className="text-amber-400" />
          </div>
          <div className="text-2xl font-bold text-amber-400 tracking-tight my-1">{data.networkCongestion}%</div>
          <span className="text-[9px] text-amber-400">Moderate Flow</span>
        </div>

        {/* Card 7: Completed Deliveries */}
        <div className="bg-[#090b0e] border border-slate-800/90 p-4 flex flex-col justify-between hover:border-slate-700 transition-all relative overflow-hidden group">
          <div className="absolute top-0 left-0 w-full h-[2px] bg-emerald-400" />
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-[10px] uppercase font-bold tracking-wider">COMPLETED</span>
            <CheckCircle2 size={13} className="text-emerald-400" />
          </div>
          <div className="text-2xl font-bold text-emerald-400 tracking-tight my-1">{data.completedDeliveriesToday}</div>
          <span className="text-[9px] text-slate-400">Stops Served Today</span>
        </div>

        {/* Card 8: System Health */}
        <div className="bg-[#090b0e] border border-slate-800/90 p-4 flex flex-col justify-between hover:border-slate-700 transition-all relative overflow-hidden group">
          <div className="absolute top-0 left-0 w-full h-[2px] bg-cyan-400" />
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-[10px] uppercase font-bold tracking-wider">SYSTEM HEALTH</span>
            <Cpu size={13} className="text-cyan-400" />
          </div>
          <div className="text-2xl font-bold text-cyan-400 tracking-tight my-1">{data.systemHealthPercent}%</div>
          <span className="text-[9px] text-emerald-400">All Nodes Online</span>
        </div>
      </div>

      {/* Main Grid Content Sections */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Left 7 Columns: Users Distribution & Operations Metrics */}
        <div className="lg:col-span-7 space-y-5">
          {/* User Roles & Access Distribution */}
          <div className="bg-[#090b0e] border border-slate-800/90 p-5 shadow-xl">
            <div className="flex items-center justify-between mb-4 border-b border-slate-800 pb-3">
              <h2 className="text-xs font-bold text-white font-mono uppercase tracking-wider flex items-center">
                <Users size={16} className="text-emerald-400 mr-2" />
                USER ROLES & ACCESS DISTRIBUTION
              </h2>
              <span className="text-xs font-mono text-slate-400 font-bold bg-slate-900 px-2.5 py-1 border border-slate-800">
                TOTAL ACCOUNTS: {totalUsersCount}
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5 font-mono">
              {dynamicRoleDistribution.map((item, i) => (
                <div
                  key={i}
                  className="p-3.5 bg-slate-900/60 border border-slate-800 hover:border-slate-700 transition-all"
                >
                  <div className="text-[10px] text-slate-400 uppercase font-bold">{item.role}</div>
                  <div className="text-2xl font-extrabold mt-1" style={{ color: item.color }}>
                    {item.count}
                  </div>
                </div>
              ))}
            </div>

            {/* Recently Provisioned Accounts */}
            <div>
              <div className="text-[11px] font-mono text-slate-400 uppercase font-bold mb-2 flex items-center justify-between">
                <span>RECENTLY PROVISIONED ACCOUNTS (PROFILES TABLE)</span>
                <span className="text-[10px] text-slate-500 font-normal">SUPABASE RLS POLICY ACTIVE</span>
              </div>
              <div className="divide-y divide-slate-800/80 font-mono text-xs bg-slate-900/30 border border-slate-800/60 p-2">
                {profilesList.map((user: any, idx: number) => {
                  const userName = user.full_name || user.name || user.email || "Provisioned User";
                  const userEmail = user.email || "user@qswarm.io";
                  const roleName = (user.role || "DISPATCHER").toUpperCase();
                  const rawDate = user.created_at || user.date || "Recently";
                  const dateDisplay = typeof rawDate === "string" && rawDate.includes("T")
                    ? rawDate.split("T")[0]
                    : rawDate;

                  return (
                    <div key={user.id || idx} className="py-2.5 px-2 flex items-center justify-between hover:bg-slate-800/30 transition-all">
                      <div>
                        <div className="text-white font-bold text-xs">{userName}</div>
                        <div className="text-[10px] text-slate-400 mt-0.5">{userEmail}</div>
                      </div>
                      <div className="text-right">
                        <span className="px-2.5 py-0.5 bg-slate-800 border border-slate-700 text-amber-400 text-[10px] font-bold">
                          {roleName}
                        </span>
                        <div className="text-[9px] text-slate-500 mt-1">{dateDisplay}</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Operational Delivery Metrics Panel */}
          <div className="bg-[#090b0e] border border-slate-800/90 p-5 shadow-xl">
            <div className="flex items-center justify-between mb-4 border-b border-slate-800 pb-3">
              <h2 className="text-xs font-bold text-white font-mono uppercase tracking-wider flex items-center">
                <Activity size={16} className="text-sky-400 mr-2" />
                OPERATIONAL DELIVERY METRICS
              </h2>
              <span className="text-xs font-mono text-emerald-400 font-bold bg-emerald-500/10 px-2.5 py-1 border border-emerald-500/30">
                SLA TARGET 98.5%
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 font-mono text-center mb-4">
              <div className="p-3 bg-slate-900/50 border border-slate-800">
                <div className="text-[10px] text-slate-400 uppercase font-bold">COMPLETED</div>
                <div className="text-xl font-bold text-emerald-400 mt-1">{data.operationsSummary.completed}</div>
              </div>
              <div className="p-3 bg-slate-900/50 border border-slate-800">
                <div className="text-[10px] text-slate-400 uppercase font-bold">IN PROGRESS</div>
                <div className="text-xl font-bold text-sky-400 mt-1">{data.operationsSummary.inProgress}</div>
              </div>
              <div className="p-3 bg-slate-900/50 border border-slate-800">
                <div className="text-[10px] text-slate-400 uppercase font-bold">DELAYED</div>
                <div className="text-xl font-bold text-amber-400 mt-1">{data.operationsSummary.delayed}</div>
              </div>
              <div className="p-3 bg-slate-900/50 border border-slate-800">
                <div className="text-[10px] text-slate-400 uppercase font-bold">EXCEPTIONS</div>
                <div className="text-xl font-bold text-rose-400 mt-1">{data.operationsSummary.exceptions}</div>
              </div>
            </div>

            <div className="p-3 bg-slate-900/80 border border-slate-800 flex items-center justify-between text-xs font-mono">
              <span className="text-slate-400 flex items-center">
                <Clock size={13} className="text-slate-500 mr-2" />
                AVERAGE DELIVERY STOP DURATION:
              </span>
              <span className="font-bold text-white bg-slate-800 px-2 py-0.5 border border-slate-700">
                {data.operationsSummary.avgTimeMin} MIN / STOP
              </span>
            </div>
          </div>
        </div>

        {/* Right 5 Columns: Fleet Capacity, Quick Actions & Audit Stream */}
        <div className="lg:col-span-5 space-y-5">
          {/* Fleet Health & Capacity Breakdown */}
          <div className="bg-[#090b0e] border border-slate-800/90 p-5 shadow-xl">
            <div className="flex items-center justify-between mb-4 border-b border-slate-800 pb-3">
              <h2 className="text-xs font-bold text-white font-mono uppercase tracking-wider flex items-center">
                <Truck size={16} className="text-amber-400 mr-2" />
                FLEET HEALTH & CAPACITY OVERVIEW
              </h2>
              <span className="text-[10px] font-mono text-emerald-400 font-bold">
                {totalPayloadTons} TONS TOTAL
              </span>
            </div>

            <div className="space-y-3.5 font-mono text-xs">
              <div>
                <div className="flex justify-between text-slate-300 mb-1">
                  <span>ACTIVE FLEET (DUTY)</span>
                  <span className="font-bold text-emerald-400">{activeVehiclesCount} / {totalVehiclesCount}</span>
                </div>
                <div className="w-full bg-slate-800 h-2">
                  <div className="bg-emerald-400 h-2 transition-all duration-500" style={{ width: `${totalVehiclesCount > 0 ? (activeVehiclesCount / totalVehiclesCount) * 100 : 100}%` }} />
                </div>
              </div>

              <div>
                <div className="flex justify-between text-slate-300 mb-1">
                  <span>IDLE / RESERVE</span>
                  <span className="font-bold text-slate-400">{idleVehiclesCount} VEHICLES</span>
                </div>
                <div className="w-full bg-slate-800 h-2">
                  <div className="bg-slate-500 h-2 transition-all duration-500" style={{ width: `${totalVehiclesCount > 0 ? (idleVehiclesCount / totalVehiclesCount) * 100 : 0}%` }} />
                </div>
              </div>

              <div>
                <div className="flex justify-between text-slate-300 mb-1">
                  <span>MAINTENANCE BAY</span>
                  <span className="font-bold text-amber-400">{maintenanceVehiclesCount} VEHICLES</span>
                </div>
                <div className="w-full bg-slate-800 h-2">
                  <div className="bg-amber-400 h-2 transition-all duration-500" style={{ width: `${totalVehiclesCount > 0 ? (maintenanceVehiclesCount / totalVehiclesCount) * 100 : 0}%` }} />
                </div>
              </div>
            </div>
          </div>

          {/* Quick Admin Actions */}
          <div className="bg-[#090b0e] border border-slate-800/90 p-5 shadow-xl">
            <h2 className="text-xs font-bold text-white font-mono uppercase tracking-wider mb-3 flex items-center">
              <SlidersHorizontal size={15} className="text-emerald-400 mr-2" />
              ADMINISTRATIVE QUICK ACTIONS
            </h2>

            <div className="grid grid-cols-2 gap-2.5 font-mono text-xs">
              <button
                onClick={() => onNavigate("users")}
                className="p-3 bg-slate-900/90 hover:bg-slate-800 border border-slate-800 hover:border-emerald-500/40 text-left transition-all group"
              >
                <div className="font-bold text-emerald-400 flex items-center justify-between">
                  <span>Manage Users</span>
                  <ArrowUpRight size={12} className="opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
                <div className="text-[10px] text-slate-400 mt-0.5">Provision roles & permissions</div>
              </button>

              <button
                onClick={() => onNavigate("vehicles")}
                className="p-3 bg-slate-900/90 hover:bg-slate-800 border border-slate-800 hover:border-sky-500/40 text-left transition-all group"
              >
                <div className="font-bold text-sky-400 flex items-center justify-between">
                  <span>Manage Fleet</span>
                  <ArrowUpRight size={12} className="opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
                <div className="text-[10px] text-slate-400 mt-0.5">Inspect vehicle parameters</div>
              </button>

              <button
                onClick={() => onNavigate("network-map")}
                className="p-3 bg-slate-900/90 hover:bg-slate-800 border border-slate-800 hover:border-amber-500/40 text-left transition-all group"
              >
                <div className="font-bold text-amber-400 flex items-center justify-between">
                  <span>Configure Network</span>
                  <ArrowUpRight size={12} className="opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
                <div className="text-[10px] text-slate-400 mt-0.5">Edit nodes & restrictions</div>
              </button>

              <button
                onClick={() => onNavigate("reports")}
                className="p-3 bg-slate-900/90 hover:bg-slate-800 border border-slate-800 hover:border-purple-500/40 text-left transition-all group"
              >
                <div className="font-bold text-purple-400 flex items-center justify-between">
                  <span>View Reports</span>
                  <ArrowUpRight size={12} className="opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
                <div className="text-[10px] text-slate-400 mt-0.5">Executive export logs</div>
              </button>
            </div>
          </div>

          {/* System Activity Stream */}
          <div className="bg-[#090b0e] border border-slate-800/90 p-5 shadow-xl">
            <h2 className="text-xs font-bold text-white font-mono uppercase tracking-wider mb-3 flex items-center">
              <Clock size={15} className="text-slate-400 mr-2" />
              SYSTEM GOVERNANCE AUDIT STREAM
            </h2>

            <div className="space-y-2.5 font-mono text-xs">
              {data.recentActivity.map((act) => (
                <div key={act.id} className="p-3 bg-slate-900/50 border border-slate-800/80 hover:border-slate-700 transition-all">
                  <div className="flex items-center justify-between text-[10px] text-slate-400 mb-1">
                    <span className="font-bold text-emerald-400">{act.type}</span>
                    <span>{act.time}</span>
                  </div>
                  <div className="font-bold text-white">{act.title}</div>
                  <div className="text-[10px] text-slate-400 mt-0.5">{act.desc}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

