import React from "react";
import { getAdminDashboardData } from "@/services/dashboardService";
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
} from "lucide-react";

interface OrgAdminDashboardProps {
  onNavigate: (tab: string) => void;
}

export function OrgAdminDashboard({ onNavigate }: OrgAdminDashboardProps) {
  const data = getAdminDashboardData();

  return (
    <div className="space-y-6 font-sans">
      {/* Header Banner */}
      <div className="p-5 bg-gradient-to-r from-slate-900 via-[#0e131b] to-slate-900 border border-slate-800 rounded-none shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2 mb-1 font-mono text-xs text-emerald-400 uppercase tracking-wider">
            <ShieldCheck size={14} />
            <span>ORGANIZATION GOVERNANCE & CONTROL CENTER</span>
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight flex items-center font-mono">
            {data.organizationName}
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            System-level health, user role allocation, fleet capacity governance, and network oversight.
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={() => onNavigate("users")}
            className="px-3.5 py-2 bg-emerald-500 hover:bg-emerald-400 text-black font-mono font-bold text-xs uppercase tracking-wider transition-all flex items-center space-x-1.5"
          >
            <UserPlus size={14} />
            <span>MANAGE USERS</span>
          </button>
          <button
            onClick={() => onNavigate("network-config")}
            className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-white font-mono text-xs uppercase tracking-wider transition-all flex items-center space-x-1.5"
          >
            <Settings size={14} />
            <span>ORG SETTINGS</span>
          </button>
        </div>
      </div>

      {/* Top Level KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-3 font-mono">
        <div className="bg-[#0b0c0e] border border-slate-800 p-3.5 flex flex-col justify-between">
          <span className="text-[10px] text-slate-400 uppercase">TOTAL VEHICLES</span>
          <div className="text-xl font-bold text-white mt-1">{data.totalVehicles}</div>
          <span className="text-[9px] text-emerald-400 mt-1">100% Provisioned</span>
        </div>

        <div className="bg-[#0b0c0e] border border-slate-800 p-3.5 flex flex-col justify-between">
          <span className="text-[10px] text-slate-400 uppercase">ACTIVE FLEET</span>
          <div className="text-xl font-bold text-emerald-400 mt-1">{data.activeVehicles}</div>
          <span className="text-[9px] text-slate-500 mt-1">80% Duty Cycle</span>
        </div>

        <div className="bg-[#0b0c0e] border border-slate-800 p-3.5 flex flex-col justify-between">
          <span className="text-[10px] text-slate-400 uppercase">DELIVERY POINTS</span>
          <div className="text-xl font-bold text-sky-400 mt-1">{data.totalDeliveryPoints}</div>
          <span className="text-[9px] text-slate-500 mt-1">3 Active Depots</span>
        </div>

        <div className="bg-[#0b0c0e] border border-slate-800 p-3.5 flex flex-col justify-between">
          <span className="text-[10px] text-slate-400 uppercase">ACTIVE ROUTES</span>
          <div className="text-xl font-bold text-white mt-1">{data.activeRoutes}</div>
          <span className="text-[9px] text-slate-500 mt-1">Live Dispatched</span>
        </div>

        <div className="bg-[#0b0c0e] border border-slate-800 p-3.5 flex flex-col justify-between">
          <span className="text-[10px] text-slate-400 uppercase">UTILIZATION</span>
          <div className="text-xl font-bold text-amber-400 mt-1">{data.avgUtilization}%</div>
          <span className="text-[9px] text-emerald-400 mt-1">+4.2% Optimal</span>
        </div>

        <div className="bg-[#0b0c0e] border border-slate-800 p-3.5 flex flex-col justify-between">
          <span className="text-[10px] text-slate-400 uppercase">CONGESTION</span>
          <div className="text-xl font-bold text-amber-400 mt-1">{data.networkCongestion}%</div>
          <span className="text-[9px] text-amber-400 mt-1">Moderate Flow</span>
        </div>

        <div className="bg-[#0b0c0e] border border-slate-800 p-3.5 flex flex-col justify-between">
          <span className="text-[10px] text-slate-400 uppercase">COMPLETED</span>
          <div className="text-xl font-bold text-emerald-400 mt-1">{data.completedDeliveriesToday}</div>
          <span className="text-[9px] text-slate-500 mt-1">Stops Served Today</span>
        </div>

        <div className="bg-[#0b0c0e] border border-slate-800 p-3.5 flex flex-col justify-between">
          <span className="text-[10px] text-slate-400 uppercase">SYSTEM HEALTH</span>
          <div className="text-xl font-bold text-emerald-400 mt-1">{data.systemHealthPercent}%</div>
          <span className="text-[9px] text-emerald-400 mt-1">All Nodes Online</span>
        </div>
      </div>

      {/* Main Grid Section */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Left Column: Organization & Users Overview */}
        <div className="lg:col-span-7 space-y-5">
          {/* Organization Overview & User Distribution */}
          <div className="bg-[#0b0c0e] border border-slate-800 p-5">
            <div className="flex items-center justify-between mb-4 border-b border-slate-800/80 pb-3">
              <h2 className="text-sm font-bold text-white font-mono uppercase tracking-wider flex items-center">
                <Users size={16} className="text-emerald-400 mr-2" />
                USER ROLES & ACCESS DISTRIBUTION
              </h2>
              <span className="text-xs font-mono text-slate-400">TOTAL USERS: {data.usersOverview.total}</span>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5 font-mono">
              {data.roleDistribution.map((item, i) => (
                <div key={i} className="p-3 bg-slate-900/50 border border-slate-800/80">
                  <div className="text-[10px] text-slate-400 uppercase">{item.role}</div>
                  <div className="text-xl font-bold text-white mt-1" style={{ color: item.color }}>
                    {item.count}
                  </div>
                </div>
              ))}
            </div>

            {/* Recent Provisioned Users */}
            <div className="space-y-2">
              <div className="text-xs font-mono text-slate-400 uppercase mb-2">RECENTLY PROVISIONED ACCOUNTS</div>
              <div className="divide-y divide-slate-800/60 font-mono text-xs">
                {data.usersOverview.recentUsers.map((user, idx) => (
                  <div key={idx} className="py-2.5 flex items-center justify-between">
                    <div>
                      <div className="text-white font-bold">{user.name}</div>
                      <div className="text-[10px] text-slate-400">{user.email}</div>
                    </div>
                    <div className="text-right">
                      <span className="px-2 py-0.5 bg-slate-800 border border-slate-700 text-amber-400 text-[10px] font-bold">
                        {user.role}
                      </span>
                      <div className="text-[9px] text-slate-500 mt-0.5">{user.date}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Operations & Delivery Summary */}
          <div className="bg-[#0b0c0e] border border-slate-800 p-5">
            <h2 className="text-sm font-bold text-white font-mono uppercase tracking-wider mb-4 flex items-center">
              <Activity size={16} className="text-sky-400 mr-2" />
              OPERATIONAL DELIVERY METRICS
            </h2>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 font-mono text-center">
              <div className="p-3 bg-slate-900/40 border border-slate-800">
                <div className="text-[10px] text-slate-400 uppercase">COMPLETED</div>
                <div className="text-lg font-bold text-emerald-400">{data.operationsSummary.completed}</div>
              </div>
              <div className="p-3 bg-slate-900/40 border border-slate-800">
                <div className="text-[10px] text-slate-400 uppercase">IN PROGRESS</div>
                <div className="text-lg font-bold text-sky-400">{data.operationsSummary.inProgress}</div>
              </div>
              <div className="p-3 bg-slate-900/40 border border-slate-800">
                <div className="text-[10px] text-slate-400 uppercase">DELAYED</div>
                <div className="text-lg font-bold text-amber-400">{data.operationsSummary.delayed}</div>
              </div>
              <div className="p-3 bg-slate-900/40 border border-slate-800">
                <div className="text-[10px] text-slate-400 uppercase">EXCEPTIONS</div>
                <div className="text-lg font-bold text-red-400">{data.operationsSummary.exceptions}</div>
              </div>
            </div>

            <div className="mt-4 p-3 bg-slate-900/60 border border-slate-800 flex items-center justify-between text-xs font-mono">
              <span className="text-slate-400">AVERAGE DELIVERY STOP DURATION:</span>
              <span className="font-bold text-white">{data.operationsSummary.avgTimeMin} MIN / STOP</span>
            </div>
          </div>
        </div>

        {/* Right Column: Fleet Health & System Audit */}
        <div className="lg:col-span-5 space-y-5">
          {/* Fleet Health Breakdown */}
          <div className="bg-[#0b0c0e] border border-slate-800 p-5">
            <h2 className="text-sm font-bold text-white font-mono uppercase tracking-wider mb-4 flex items-center">
              <Truck size={16} className="text-amber-400 mr-2" />
              FLEET HEALTH & CAPACITY OVERVIEW
            </h2>

            <div className="space-y-3 font-mono text-xs">
              <div>
                <div className="flex justify-between text-slate-300 mb-1">
                  <span>ACTIVE FLEET (DUTY)</span>
                  <span className="font-bold text-emerald-400">{data.fleetHealth.active} / {data.totalVehicles}</span>
                </div>
                <div className="w-full bg-slate-800 h-2">
                  <div className="bg-emerald-400 h-2" style={{ width: `${(data.fleetHealth.active / data.totalVehicles) * 100}%` }} />
                </div>
              </div>

              <div>
                <div className="flex justify-between text-slate-300 mb-1">
                  <span>IDLE / RESERVE</span>
                  <span className="font-bold text-slate-400">{data.fleetHealth.idle} VEHICLES</span>
                </div>
                <div className="w-full bg-slate-800 h-2">
                  <div className="bg-slate-500 h-2" style={{ width: `${(data.fleetHealth.idle / data.totalVehicles) * 100}%` }} />
                </div>
              </div>

              <div>
                <div className="flex justify-between text-slate-300 mb-1">
                  <span>MAINTENANCE BAY</span>
                  <span className="font-bold text-amber-400">{data.fleetHealth.maintenance} VEHICLES</span>
                </div>
                <div className="w-full bg-slate-800 h-2">
                  <div className="bg-amber-400 h-2" style={{ width: `${(data.fleetHealth.maintenance / data.totalVehicles) * 100}%` }} />
                </div>
              </div>
            </div>
          </div>

          {/* Quick Admin Actions */}
          <div className="bg-[#0b0c0e] border border-slate-800 p-5">
            <h2 className="text-sm font-bold text-white font-mono uppercase tracking-wider mb-3 flex items-center">
              <SlidersHorizontal size={16} className="text-emerald-400 mr-2" />
              ADMINISTRATIVE QUICK ACTIONS
            </h2>

            <div className="grid grid-cols-2 gap-2 font-mono text-xs">
              <button
                onClick={() => onNavigate("users")}
                className="p-3 bg-slate-900 hover:bg-slate-800 border border-slate-800 text-left transition-all text-slate-200 hover:text-white"
              >
                <div className="font-bold text-emerald-400">Manage Users</div>
                <div className="text-[10px] text-slate-400 mt-0.5">Provision roles & access</div>
              </button>
              <button
                onClick={() => onNavigate("live-fleet")}
                className="p-3 bg-slate-900 hover:bg-slate-800 border border-slate-800 text-left transition-all text-slate-200 hover:text-white"
              >
                <div className="font-bold text-sky-400">Manage Fleet</div>
                <div className="text-[10px] text-slate-400 mt-0.5">Inspect vehicle status</div>
              </button>
              <button
                onClick={() => onNavigate("network-map")}
                className="p-3 bg-slate-900 hover:bg-slate-800 border border-slate-800 text-left transition-all text-slate-200 hover:text-white"
              >
                <div className="font-bold text-amber-400">Configure Network</div>
                <div className="text-[10px] text-slate-400 mt-0.5">Edit nodes & edges</div>
              </button>
              <button
                onClick={() => onNavigate("fleet-performance")}
                className="p-3 bg-slate-900 hover:bg-slate-800 border border-slate-800 text-left transition-all text-slate-200 hover:text-white"
              >
                <div className="font-bold text-purple-400">View Analytics</div>
                <div className="text-[10px] text-slate-400 mt-0.5">Executive reports</div>
              </button>
            </div>
          </div>

          {/* System Activity Stream */}
          <div className="bg-[#0b0c0e] border border-slate-800 p-5">
            <h2 className="text-sm font-bold text-white font-mono uppercase tracking-wider mb-3 flex items-center">
              <Clock size={16} className="text-slate-400 mr-2" />
              SYSTEM GOVERNANCE AUDIT STREAM
            </h2>

            <div className="space-y-3 font-mono text-xs">
              {data.recentActivity.map((act) => (
                <div key={act.id} className="p-2.5 bg-slate-900/40 border border-slate-800/80">
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
