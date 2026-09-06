import React from "react";
import { useAuth } from "@/contexts/AuthContext";
import {
  Activity,
  Clock,
  Radio,
  Bell,
  User as UserIcon,
  Sparkles,
  Shield,
  Layers,
  ChevronDown,
} from "lucide-react";

interface TopHeaderProps {
  currentTab: string;
  onNavigate: (tab: string) => void;
  isJuryDemoActive: boolean;
  onToggleJuryDemo: () => void;
}

export function TopHeader({
  currentTab,
  onNavigate,
  isJuryDemoActive,
  onToggleJuryDemo,
}: TopHeaderProps) {
  const { user, profile } = useAuth();

  const displayName = profile?.full_name || user?.email?.split("@")[0] || "Operations Manager";

  return (
    <header className="h-14 bg-[#0c0e12] border-b border-slate-800 px-4 flex items-center justify-between font-mono text-xs text-white selection:bg-slate-700 select-none z-30">
      {/* Left Telemetry Strip */}
      <div className="flex items-center space-x-4">
        {/* Network Selector */}
        <div className="flex items-center space-x-2 bg-slate-900 border border-slate-800 px-2.5 py-1">
          <Layers size={13} className="text-sky-400" />
          <span className="text-slate-400 uppercase font-semibold text-[11px]">NETWORK:</span>
          <span className="font-bold text-white">Rajpur Urban Network</span>
          <ChevronDown size={12} className="text-slate-500 ml-1" />
        </div>

        {/* Live Simulation Indicator */}
        <div className="hidden md:flex items-center space-x-1.5 bg-emerald-500/10 border border-emerald-500/30 px-2.5 py-1 text-emerald-400 font-semibold">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span>LIVE SIMULATION</span>
        </div>

        {/* Simulation Time */}
        <div className="hidden lg:flex items-center space-x-1.5 text-slate-300">
          <Clock size={13} className="text-slate-400" />
          <span className="text-slate-500">TIME:</span>
          <span className="font-bold text-white">08:42 AM</span>
        </div>

        {/* Traffic Status */}
        <div className="hidden xl:flex items-center space-x-1.5 text-slate-300">
          <Activity size={13} className="text-amber-400" />
          <span className="text-slate-500">TRAFFIC:</span>
          <span className="font-bold text-amber-400">MODERATE</span>
        </div>

        {/* System Optimization Status */}
        <div className="hidden xl:flex items-center space-x-1.5 text-slate-300">
          <Radio size={13} className="text-emerald-400" />
          <span className="text-slate-500">SYSTEM:</span>
          <span className="font-bold text-emerald-400">OPTIMIZATION READY</span>
        </div>
      </div>

      {/* Right User & SIH Guided Demo Strip */}
      <div className="flex items-center space-x-3">
        {/* Guided SIH Jury Demo Button */}
        <button
          onClick={onToggleJuryDemo}
          className={`flex items-center space-x-1.5 px-3 py-1 border transition-all ${
            isJuryDemoActive
              ? "bg-amber-500 text-black font-bold border-amber-400 shadow-md"
              : "bg-amber-500/10 text-amber-400 hover:bg-amber-500/20 border-amber-500/30"
          }`}
        >
          <Sparkles size={13} />
          <span className="uppercase tracking-wider font-bold">JURY DEMO MODE</span>
        </button>

        {/* Notification Bell */}
        <button className="relative p-1.5 text-slate-400 hover:text-white transition-colors bg-slate-900 border border-slate-800">
          <Bell size={14} />
          <span className="absolute top-0 right-0 w-2 h-2 rounded-full bg-red-500" />
        </button>

        {/* User Badge */}
        <div className="flex items-center space-x-2 pl-2 border-l border-slate-800">
          <div className="w-7 h-7 rounded bg-slate-800 border border-slate-700 flex items-center justify-center font-bold text-sky-400">
            {displayName.charAt(0).toUpperCase()}
          </div>
          <div className="hidden md:block text-left">
            <div className="font-bold text-white leading-tight">{displayName}</div>
            <div className="text-[9px] text-slate-400 uppercase font-sans">
              {profile?.role ? profile.role.replace("_", " ") : "SIH 2026 Fleet Ops"}
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
