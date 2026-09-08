import React from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Permission } from "@/contexts/rbacPermissions";
import {
  LayoutDashboard,
  Truck,
  Navigation,
  AlertTriangle,
  Cpu,
  RefreshCw,
  History,
  Map,
  PackageCheck,
  Building2,
  ShieldAlert,
  BarChart3,
  Activity,
  Sliders,
  Play,
  Settings,
  LogOut,
  GitBranch,
  Sparkles,
  Users,
  Building,
  FileText,
} from "lucide-react";

interface SidebarProps {
  activeTab: string;
  onNavigate: (tab: string) => void;
}

interface NavItem {
  id: string;
  label: string;
  icon: any;
  permission?: Permission;
}

interface NavSection {
  title: string;
  items: NavItem[];
}

export function AppSidebar({ activeTab, onNavigate }: SidebarProps) {
  const { user, profile, organization, role, hasPermission, logout } = useAuth();

  const navSections: NavSection[] = [
    {
      title: "OVERVIEW",
      items: [
        { id: "overview", label: "Fleet Operations", icon: LayoutDashboard, permission: "dashboard:view" },
      ],
    },
    {
      title: "OPERATIONS",
      items: [
        { id: "live-fleet", label: "Live Fleet", icon: Truck, permission: "fleet:view" },
        { id: "traffic-events", label: "Traffic Events", icon: AlertTriangle, permission: "incidents:view" },
      ],
    },
    {
      title: "OPTIMIZATION",
      items: [
        { id: "route-optimization", label: "Route Optimization", icon: Cpu, permission: "optimization:view" },
        { id: "reoptimization", label: "Reoptimization", icon: RefreshCw, permission: "reoptimization:view" },
        { id: "optimization-history", label: "Optimization History", icon: History, permission: "optimization:view" },
      ],
    },
    {
      title: "NETWORK",
      items: [
        { id: "network-map", label: "Network Map", icon: Map, permission: "network:view" },
        { id: "vehicles", label: "Vehicles", icon: Truck, permission: "vehicles:view" },
        { id: "delivery-points", label: "Delivery Points", icon: PackageCheck, permission: "customers:view" },
        { id: "depots", label: "Depots", icon: Building2, permission: "depots:view" },
        { id: "restrictions", label: "Restrictions", icon: ShieldAlert, permission: "restrictions:view" },
      ],
    },
    {
      title: "ANALYST & REPORTS",
      items: [
        { id: "fleet-performance", label: "Fleet Performance", icon: BarChart3, permission: "analytics:view" },
        { id: "traffic-analytics", label: "Traffic Analytics", icon: Activity, permission: "traffic:view" },
        { id: "benchmark", label: "Algorithm Benchmark", icon: Sliders, permission: "benchmarks:view" },
        { id: "reports", label: "Reports & Exports", icon: FileText, permission: "analytics:view" },
      ],
    },
    {
      title: "ADMINISTRATION",
      items: [
        { id: "users", label: "User Management", icon: Users, permission: "users:view" },
        { id: "organization", label: "Org Settings", icon: Building, permission: "organization:view" },
      ],
    },
    {
      title: "SYSTEM",
      items: [
        { id: "simulation", label: "Simulation", icon: Play, permission: "simulation:view" },
        { id: "architecture", label: "Architecture", icon: GitBranch, permission: "dashboard:view" },
        { id: "settings", label: "Settings", icon: Settings, permission: "dashboard:view" },
      ],
    },
  ];

  return (
    <aside className="w-64 bg-[#090b0e] border-r border-slate-800 flex flex-col justify-between selection:bg-slate-700 select-none z-20 font-sans">
      {/* Brand Header */}
      <div>
        <div className="p-4 border-b border-slate-800/80 flex items-center space-x-3 bg-[#0c0e12]">
          <div className="w-8 h-8 rounded bg-sky-500/10 border border-sky-500/30 flex items-center justify-center text-sky-400 font-mono font-bold text-sm">
            Q
          </div>
          <div className="truncate">
            <div className="font-mono font-bold text-base text-white tracking-tight flex items-center">
              Q-FLOW
              <span className="ml-1 text-[9px] px-1 py-0.2 bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded font-normal">
                v2.4
              </span>
            </div>
            <div className="text-[10px] text-slate-400 font-mono tracking-wide truncate">
              {organization?.name || "Fleet Intelligence"}
            </div>
          </div>
        </div>

        {/* Guided SIH Demo Shortcut */}
        <div className="px-3 pt-3">
          <button
            onClick={() => onNavigate("jury-demo")}
            className={`w-full py-2 px-3 flex items-center justify-between text-xs font-mono border transition-all ${
              activeTab === "jury-demo"
                ? "bg-amber-500 text-black font-bold border-amber-400"
                : "bg-amber-500/10 text-amber-400 hover:bg-amber-500/20 border-amber-500/30"
            }`}
          >
            <span className="flex items-center">
              <Sparkles size={13} className="mr-1.5" /> JURY DEMO MODE
            </span>
            <span className="text-[9px] uppercase px-1 bg-amber-400/20 text-amber-300">8 STEPS</span>
          </button>
        </div>

        {/* Role-Filtered Navigation List */}
        <nav className="p-3 space-y-4 max-h-[calc(100vh-250px)] overflow-y-auto custom-scrollbar">
          {navSections.map((section) => {
            const allowedItems = section.items.filter(
              (item) => !item.permission || hasPermission(item.permission)
            );

            if (allowedItems.length === 0) return null;

            return (
              <div key={section.title} className="space-y-1">
                <div className="px-2 text-[10px] font-mono font-semibold text-slate-400 uppercase tracking-wider">
                  {section.title}
                </div>
                {allowedItems.map((item) => {
                  const Icon = item.icon;
                  const isActive = activeTab === item.id;
                  return (
                    <button
                      key={item.id}
                      onClick={() => onNavigate(item.id)}
                      className={`w-full flex items-center space-x-2.5 px-2.5 py-1.5 text-xs font-mono rounded-none transition-colors text-left ${
                        isActive
                          ? "bg-slate-800 text-sky-400 font-bold border-l-2 border-sky-400"
                          : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/40"
                      }`}
                    >
                      <Icon size={14} className={isActive ? "text-sky-400" : "text-slate-500"} />
                      <span className="truncate">{item.label}</span>
                    </button>
                  );
                })}
              </div>
            );
          })}
        </nav>
      </div>

      {/* Footer User Info & Active Role Badge */}
      <div className="p-3 border-t border-slate-800 bg-[#0c0e12] space-y-2">
        <div className="flex items-center justify-between text-xs font-mono">
          <div className="truncate">
            <div className="font-bold text-white truncate">{profile?.full_name || user?.email || "Operator"}</div>
            <div className="text-[10px] text-amber-400 font-bold tracking-wider uppercase truncate">
              {role.replace(/_/g, " ")}
            </div>
          </div>
          <button
            onClick={logout}
            className="p-1.5 text-slate-400 hover:text-red-400 transition-colors"
            title="Sign Out"
          >
            <LogOut size={14} />
          </button>
        </div>
      </div>
    </aside>
  );
}
