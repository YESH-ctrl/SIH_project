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
    <header className="h-14 bg-[#080808] border-b border-neutral-800 px-4 flex items-center justify-between font-mono text-xs text-white selection:bg-[#c8ff00] selection:text-black select-none z-30 relative">
      {/* Top Electric Lime Highlight Line */}
      <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-[#c8ff00] via-emerald-400 to-amber-400" />

      {/* Left Telemetry Strip */}
      <div className="flex items-center space-x-4">
        {/* Brand Lockup */}
        <button
          onClick={() => onNavigate("overview")}
          className="flex items-center space-x-2 mr-2 hover:opacity-80 transition-opacity"
        >
          <img src="/assets/qswarm-mark.webp" alt="QSWARM" className="w-5 h-5 object-contain" />
          <span className="font-bold tracking-tight text-white font-mono text-sm hidden sm:inline">
            QSWARM
          </span>
        </button>

        {/* Live Simulation Indicator */}
        <div className="hidden md:flex items-center space-x-1.5 bg-[#c8ff00]/10 border border-[#c8ff00]/30 px-2.5 py-1 text-[#c8ff00] font-semibold">
          <span className="w-2 h-2 rounded-full bg-[#c8ff00] animate-pulse" />
          <span>LIVE SIMULATION</span>
        </div>

        {/* Simulation Time */}
        <div className="hidden lg:flex items-center space-x-1.5 text-neutral-300">
          <Clock size={13} className="text-[#c8ff00]" />
          <span className="text-neutral-500">TIME:</span>
          <span className="font-bold text-white">08:42 AM</span>
        </div>

        {/* Traffic Status */}
        <div className="hidden xl:flex items-center space-x-1.5 text-neutral-300">
          <Activity size={13} className="text-amber-400" />
          <span className="text-neutral-500">TRAFFIC:</span>
          <span className="font-bold text-amber-400">MODERATE</span>
        </div>

        {/* System Optimization Status */}
        <div className="hidden xl:flex items-center space-x-1.5 text-neutral-300">
          <Radio size={13} className="text-emerald-400" />
          <span className="text-neutral-500">SYSTEM:</span>
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
              ? "bg-[#c8ff00] text-black font-bold border-[#c8ff00] shadow-[0_0_12px_rgba(200,255,0,0.4)]"
              : "bg-[#c8ff00]/10 text-[#c8ff00] hover:bg-[#c8ff00]/20 border-[#c8ff00]/30"
          }`}
        >
          <Sparkles size={13} />
          <span className="uppercase tracking-wider font-bold">JURY DEMO MODE</span>
        </button>

        {/* Notification Bell */}
        <button className="relative p-1.5 text-neutral-400 hover:text-white transition-colors bg-[#111111] border border-neutral-800">
          <Bell size={14} />
          <span className="absolute top-0 right-0 w-2 h-2 rounded-full bg-[#ff4d2d]" />
        </button>

        {/* User Badge */}
        <div className="flex items-center space-x-2 pl-2 border-l border-neutral-800">
          <div className="w-7 h-7 bg-black border border-[#c8ff00]/50 flex items-center justify-center font-bold text-[#c8ff00]">
            {displayName.charAt(0).toUpperCase()}
          </div>
          <div className="hidden md:block text-left">
            <div className="font-bold text-white leading-tight">{displayName}</div>
            <div className="text-[9px] text-[#c8ff00] uppercase font-mono font-semibold">
              {profile?.role ? profile.role.replace("_", " ") : "SIH 2026 Fleet Ops"}
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}

