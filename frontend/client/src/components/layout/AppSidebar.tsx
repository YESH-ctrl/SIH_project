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
        { id: "benchmark", label: "Algorithm Benchmark", icon: Sliders, permission: "benchmarks:view" },
        { id: "reports", label: "Reports & Exports", icon: FileText, permission: "analytics:view" },
      ],
    },
  ];

  return (
    <aside className="w-64 bg-[#080808] border-r border-neutral-800 flex flex-col justify-between selection:bg-[#c8ff00] selection:text-black select-none z-20 font-mono">
      {/* Brand Header */}
      <div>
        <div className="p-4 border-b border-neutral-800 flex items-center space-x-3 bg-[#0d0d0d]">
          <div className="w-8 h-8 rounded-none bg-black border border-[#c8ff00]/40 flex items-center justify-center p-1">
            <img src="/assets/qswarm-mark.webp" alt="QSWARM" className="w-full h-full object-contain" />
          </div>
          <div className="truncate">
            <div className="font-mono font-bold text-base text-white tracking-tight flex items-center space-x-1.5">
              <span>QSWARM</span>
              <span className="text-[9px] px-1 py-0.2 bg-[#c8ff00]/10 text-[#c8ff00] border border-[#c8ff00]/30 rounded-none font-semibold">
                v2.4
              </span>
            </div>
            <div className="text-[10px] text-neutral-400 font-mono tracking-wide truncate">
              {organization?.name || "SIH 2026 Fleet System"}
            </div>
          </div>
        </div>

        {/* Guided SIH Demo Shortcut */}
        <div className="px-3 pt-3">
          <button
            onClick={() => onNavigate("jury-demo")}
            className={`w-full py-2 px-3 flex items-center justify-between text-xs font-mono border transition-all ${
              activeTab === "jury-demo"
                ? "bg-[#c8ff00] text-black font-bold border-[#c8ff00] shadow-[0_0_12px_rgba(200,255,0,0.3)]"
                : "bg-[#c8ff00]/10 text-[#c8ff00] hover:bg-[#c8ff00]/20 border-[#c8ff00]/30"
            }`}
          >
            <span className="flex items-center font-bold">
              <Sparkles size={13} className="mr-1.5" /> JURY DEMO MODE
            </span>
            <span className="text-[9px] uppercase px-1 bg-[#c8ff00]/20 text-black font-bold">8 STEPS</span>
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
                <div className="px-2 text-[10px] font-mono font-bold text-neutral-500 uppercase tracking-wider">
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
                          ? "bg-[#111111] text-[#c8ff00] font-bold border-l-2 border-[#c8ff00]"
                          : "text-neutral-400 hover:text-white hover:bg-white/5"
                      }`}
                    >
                      <Icon size={14} className={isActive ? "text-[#c8ff00]" : "text-neutral-500"} />
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
      <div className="p-3 border-t border-neutral-800 bg-[#0d0d0d] space-y-2">
        <div className="flex items-center justify-between text-xs font-mono">
          <div className="truncate">
            <div className="font-bold text-white truncate">{profile?.full_name || user?.email || "Operator"}</div>
            <div className="text-[10px] text-[#c8ff00] font-bold tracking-wider uppercase truncate">
              {role.replace(/_/g, " ")}
            </div>
          </div>
          <button
            onClick={logout}
            className="p-1.5 text-neutral-400 hover:text-[#ff4d2d] transition-colors"
            title="Sign Out"
          >
            <LogOut size={14} />
          </button>
        </div>
      </div>
    </aside>
  );
}

