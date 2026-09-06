import React, { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { TopHeader } from "@/components/layout/TopHeader";
import { AppSidebar } from "@/components/layout/AppSidebar";
import { OrgAdminDashboard } from "@/components/dashboards/OrgAdminDashboard";
import { OperationsManagerDashboard } from "@/components/dashboards/OperationsManagerDashboard";
import { DispatcherDashboard } from "@/components/dashboards/DispatcherDashboard";
import { AnalystDashboard } from "@/components/dashboards/AnalystDashboard";
import { OverviewPage } from "@/components/qflow/OverviewPage";
import { RouteOptimizationPage } from "@/components/qflow/RouteOptimizationPage";
import { ReoptimizationPage } from "@/components/qflow/ReoptimizationPage";
import { TrafficEventsPage } from "@/components/qflow/TrafficEventsPage";
import { LiveFleetPage } from "@/components/qflow/LiveFleetPage";
import { NetworkMapPage } from "@/components/qflow/NetworkMapPage";
import { TrafficIntelligencePage } from "@/components/qflow/TrafficIntelligencePage";
import { AnalyticsPage } from "@/components/qflow/AnalyticsPage";
import { BenchmarkPage } from "@/components/qflow/BenchmarkPage";
import { HistoryPage } from "@/components/qflow/HistoryPage";
import { NetworkConfigPage } from "@/components/qflow/NetworkConfigPage";
import { SimulationPage } from "@/components/qflow/SimulationPage";
import { ArchitecturePage } from "@/components/qflow/ArchitecturePage";
import { JuryDemoWizard } from "@/components/qflow/JuryDemoWizard";
import { ShieldAlert } from "lucide-react";

export default function Dashboard() {
  const { role, profile, organization, hasPermission } = useAuth();
  
  // Set default initial view based on Role-Aware Dashboard specification
  const getDefaultTabForRole = (): string => {
    return "overview";
  };

  const [activeTab, setActiveTab] = useState<string>("overview");
  const [isJuryDemoActive, setIsJuryDemoActive] = useState<boolean>(false);

  useEffect(() => {
    setActiveTab(getDefaultTabForRole());
  }, [role]);

  const handleNavigate = (tab: string) => {
    setActiveTab(tab);
    if (tab === "jury-demo") {
      setIsJuryDemoActive(true);
    } else {
      setIsJuryDemoActive(false);
    }
  };

  const handleTriggerIncidentDemo = () => {
    setActiveTab("reoptimization");
  };

  const renderRoleDashboard = () => {
    switch (role) {
      case "ORG_ADMIN":
      case "SUPER_ADMIN":
        return <OrgAdminDashboard onNavigate={handleNavigate} />;
      case "DISPATCHER":
        return (
          <DispatcherDashboard
            onNavigate={handleNavigate}
            onTriggerIncidentDemo={handleTriggerIncidentDemo}
          />
        );
      case "ANALYST":
        return <AnalystDashboard onNavigate={handleNavigate} />;
      case "OPERATIONS_MANAGER":
      default:
        return (
          <OperationsManagerDashboard
            onNavigate={handleNavigate}
            onTriggerIncidentDemo={handleTriggerIncidentDemo}
          />
        );
    }
  };

  return (
    <div className="min-h-screen bg-[#060708] text-white flex flex-col font-sans selection:bg-slate-700 selection:text-white">
      {/* Top Header Bar */}
      <TopHeader
        currentTab={activeTab}
        onNavigate={handleNavigate}
        isJuryDemoActive={isJuryDemoActive}
        onToggleJuryDemo={() => {
          if (isJuryDemoActive) {
            setIsJuryDemoActive(false);
            setActiveTab("overview");
          } else {
            setIsJuryDemoActive(true);
            setActiveTab("jury-demo");
          }
        }}
      />

      {/* Main Workspace Layout */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Sidebar */}
        <AppSidebar activeTab={activeTab} onNavigate={handleNavigate} />

        {/* Main Content Area */}
        <main className="flex-1 bg-[#060708] p-4 md:p-6 overflow-y-auto custom-scrollbar">
          <div className="max-w-[1600px] mx-auto">
            {/* Role & Organization Banner for Transparency */}
            <div className="mb-4 p-2 bg-[#0c0e12] border border-slate-800/80 flex items-center justify-between font-mono text-[11px]">
              <div className="flex items-center space-x-2">
                <span className="w-2 h-2 rounded-full bg-emerald-400" />
                <span className="text-slate-400">AUTHENTICATED ROLE:</span>
                <span className="font-bold text-amber-400 uppercase">{role.replace(/_/g, " ")}</span>
                <span className="text-slate-500">|</span>
                <span className="text-slate-400">ORGANIZATION:</span>
                <span className="font-bold text-white">{organization?.name || "SIH 2026 Fleet Operations"}</span>
              </div>
              <span className="text-slate-500 text-[10px]">SUPABASE RLS ENFORCED</span>
            </div>

            {/* Render Views */}
            {activeTab === "overview" && renderRoleDashboard()}

            {activeTab === "reports" && <AnalystDashboard onNavigate={handleNavigate} />}

            {activeTab === "route-optimization" && (
              hasPermission("optimization:view") ? (
                <RouteOptimizationPage />
              ) : (
                <UnauthorizedCard permission="optimization:view" />
              )
            )}

            {activeTab === "reoptimization" && (
              hasPermission("reoptimization:view") ? (
                <ReoptimizationPage />
              ) : (
                <UnauthorizedCard permission="reoptimization:view" />
              )
            )}

            {activeTab === "traffic-events" && (
              hasPermission("incidents:view") ? (
                <TrafficEventsPage onTriggerReoptimization={handleTriggerIncidentDemo} />
              ) : (
                <UnauthorizedCard permission="incidents:view" />
              )
            )}

            {(activeTab === "live-fleet" || activeTab === "route-monitor") && (
              hasPermission("fleet:view") ? (
                <LiveFleetPage />
              ) : (
                <UnauthorizedCard permission="fleet:view" />
              )
            )}

            {activeTab === "network-map" && (
              hasPermission("network:view") ? (
                <NetworkMapPage />
              ) : (
                <UnauthorizedCard permission="network:view" />
              )
            )}

            {activeTab === "traffic-analytics" && (
              hasPermission("traffic:view") ? (
                <TrafficIntelligencePage />
              ) : (
                <UnauthorizedCard permission="traffic:view" />
              )
            )}

            {activeTab === "fleet-performance" && (
              hasPermission("analytics:view") ? (
                <AnalyticsPage />
              ) : (
                <UnauthorizedCard permission="analytics:view" />
              )
            )}

            {activeTab === "benchmark" && (
              hasPermission("benchmarks:view") ? (
                <BenchmarkPage />
              ) : (
                <UnauthorizedCard permission="benchmarks:view" />
              )
            )}

            {activeTab === "optimization-history" && (
              hasPermission("optimization:view") ? (
                <HistoryPage />
              ) : (
                <UnauthorizedCard permission="optimization:view" />
              )
            )}

            {(activeTab === "vehicles" ||
              activeTab === "delivery-points" ||
              activeTab === "depots" ||
              activeTab === "restrictions" ||
              activeTab === "users" ||
              activeTab === "organization" ||
              activeTab === "settings") && <NetworkConfigPage subTab={activeTab} />}

            {activeTab === "simulation" && (
              hasPermission("simulation:view") ? (
                <SimulationPage onTriggerIncidentDemo={handleTriggerIncidentDemo} />
              ) : (
                <UnauthorizedCard permission="simulation:view" />
              )
            )}

            {activeTab === "architecture" && <ArchitecturePage />}

            {activeTab === "jury-demo" && (
              <JuryDemoWizard onFinishDemo={() => handleNavigate("overview")} />
            )}
          </div>
        </main>
      </div>
    </div>
  );
}

function UnauthorizedCard({ permission }: { permission: string }) {
  return (
    <div className="p-8 bg-[#0d1015] border border-red-500/40 text-center font-mono space-y-3 max-w-xl mx-auto my-12">
      <ShieldAlert size={36} className="text-red-400 mx-auto" />
      <h2 className="text-lg font-bold text-white uppercase">UNAUTHORIZED ROLE ACTION</h2>
      <p className="text-xs font-sans text-slate-400">
        Your assigned role does not hold the required permission (<code className="text-amber-400">{permission}</code>) to view this module.
      </p>
      <div className="text-[10px] text-slate-500 pt-2 border-t border-slate-800">
        Authorization is enforced via Supabase Row-Level Security & Role-Based Access Control.
      </div>
    </div>
  );
}
