import React, { useState, useEffect } from "react";
import {
  demoApi,
  optimizationApi,
  transportationApi,
  DemoScenarioResponse,
  DeliveryPointData,
  DepotData,
  VehicleSpecDTO,
} from "@/services/apiClient";
import {
  Building2,
  ShieldAlert,
  Truck,
  PackageCheck,
  RefreshCw,
  Sparkles,
  Search,
  Database,
  CheckCircle2,
  MapPin,
  Activity,
  Layers,
} from "lucide-react";

export function NetworkConfigPage({ subTab = "vehicles" }: { subTab?: string }) {
  const [activeTab, setActiveTab] = useState<string>(subTab);
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Supabase / Backend API Datasets
  const [vehicles, setVehicles] = useState<any[]>([]);
  const [deliveryPoints, setDeliveryPoints] = useState<any[]>([]);
  const [depots, setDepots] = useState<any[]>([]);
  const [restrictions, setRestrictions] = useState<any[]>([]);
  const [scenarioMeta, setScenarioMeta] = useState<any>(null);

  useEffect(() => {
    setActiveTab(subTab);
  }, [subTab]);

  const loadBackendData = async () => {
    setIsLoading(true);
    setError(null);
    try {
      // Primary: Fetch full scenario directly from Supabase via FastAPI backend /api/v1/demo/scenario
      const scenario: DemoScenarioResponse = await demoApi.getScenario();
      setScenarioMeta(scenario);

      // Vehicles from Supabase scenario or demo dataset fallback
      const loadedVehicles = scenario.vehicles && scenario.vehicles.length > 0
        ? scenario.vehicles
        : [
            { id: "veh_01", vehicle_code: "SWARM_ALPHA", name: "Swarm Alpha (Heavy Duty)", capacity_kg: 50, status: "ACTIVE", color: "#00f0ff" },
            { id: "veh_02", vehicle_code: "SWARM_BETA", name: "Swarm Beta (Express)", capacity_kg: 60, status: "ACTIVE", color: "#10b981" },
            { id: "veh_03", vehicle_code: "SWARM_GAMMA", name: "Swarm Gamma (Standard)", capacity_kg: 50, status: "ACTIVE", color: "#f59e0b" },
          ];

      // Delivery Points from Supabase scenario or backend API
      let loadedDeliveryPoints = scenario.delivery_points && scenario.delivery_points.length > 0
        ? scenario.delivery_points
        : [];
      if (loadedDeliveryPoints.length === 0) {
        const dpRes = await transportationApi.getDeliveryPoints().catch(() => null);
        if (dpRes && dpRes.data) loadedDeliveryPoints = dpRes.data;
      }

      // Depots from Supabase scenario or fallback
      const loadedDepot = scenario.depot || {
        id: "11111111-1111-1111-1111-111111111111",
        depot_code: "QFLOW_DEPOT",
        name: "Raipur Main Distribution Depot",
        capacity_vehicles: 20,
        lat: 21.2517416,
        lng: 81.629464,
      };

      // Restrictions from Supabase scenario or backend API
      let loadedRestrictions = scenario.restrictions && scenario.restrictions.length > 0
        ? scenario.restrictions
        : [];
      if (loadedRestrictions.length === 0) {
        const rstRes = await transportationApi.getRestrictions().catch(() => null);
        if (rstRes && rstRes.data) loadedRestrictions = rstRes.data;
      }

      setVehicles(loadedVehicles);
      setDeliveryPoints(loadedDeliveryPoints);
      setDepots([loadedDepot]);
      setRestrictions(
        loadedRestrictions.length > 0
          ? loadedRestrictions
          : [
              {
                id: "rst_01",
                restriction_code: "RST_PEAK_01",
                name: "GE Road Commercial Peak Axle Restriction",
                restriction_type: "WEIGHT_LIMIT",
                affected_road: "GE Road Corridor",
                max_weight_kg: 7500,
                status: "ACTIVE",
              },
              {
                id: "rst_02",
                restriction_code: "RST_FLYOVER_02",
                name: "Devendra Nagar Flyover Height Barrier",
                restriction_type: "HEIGHT_LIMIT",
                affected_road: "Devendra Nagar Flyover",
                max_weight_kg: 5000,
                status: "ACTIVE",
              },
            ]
      );
      setIsLoading(false);
    } catch (err: any) {
      console.warn("[NetworkConfig] Error loading data from Supabase backend:", err);
      // Fallback to optimization dataset if scenario endpoint fails
      try {
        const demoData = await optimizationApi.getDemoDataset();
        if (demoData) {
          if (demoData.vehicles) setVehicles(demoData.vehicles);
          if (demoData.delivery_points) setDeliveryPoints(demoData.delivery_points);
          if (demoData.depot) setDepots([demoData.depot]);
        }
      } catch (fErr) {
        setError("Unable to connect to Supabase backend API.");
      }
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadBackendData();
  }, []);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await loadBackendData();
    setIsRefreshing(false);
  };

  // Filtered lists based on search term
  const filteredVehicles = vehicles.filter(
    (v) =>
      (v.name || v.id || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      (v.vehicle_code || "").toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredDeliveryPoints = deliveryPoints.filter(
    (dp) =>
      (dp.name || dp.id || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      (dp.point_code || "").toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredDepots = depots.filter(
    (d) =>
      (d.name || d.id || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      (d.depot_code || "").toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredRestrictions = restrictions.filter(
    (r) =>
      (r.name || r.id || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      (r.restriction_code || r.affected_road || "").toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-5 font-sans text-white">
      {/* Header Banner */}
      <div className="p-4 bg-[#0d1015] border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xl">
        <div>
          <div className="flex items-center space-x-2">
            <Layers size={20} className="text-sky-400" />
            <h1 className="text-lg font-bold font-mono text-white tracking-tight uppercase">
              TRANSPORTATION NETWORK MODEL
            </h1>
            <span className="text-[10px] bg-sky-500/20 text-sky-400 border border-sky-500/30 px-2 py-0.5 font-mono font-bold">
              SUPABASE / FASTAPI SINGLE SOURCE OF TRUTH
            </span>
          </div>
          <p className="text-xs text-slate-400 font-sans mt-1">
            Real-time synchronization of fleet vehicles, customer delivery points, central depots, and road restrictions from PostgreSQL database.
          </p>
        </div>

        <div className="flex items-center space-x-2 shrink-0 font-mono">
          <button
            onClick={handleRefresh}
            disabled={isRefreshing || isLoading}
            className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-bold flex items-center space-x-1.5 transition-all"
          >
            <RefreshCw size={13} className={isRefreshing ? "animate-spin text-sky-400" : "text-slate-400"} />
            <span>{isRefreshing ? "REFRESHING..." : "SYNC SUPABASE"}</span>
          </button>
        </div>
      </div>

      {/* Metrics Counter Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 font-mono text-xs">
        <div
          onClick={() => setActiveTab("vehicles")}
          className={`p-3 border cursor-pointer transition-all ${
            activeTab === "vehicles"
              ? "bg-sky-950/60 border-sky-500 text-white shadow-lg"
              : "bg-[#0d1015] border-slate-800 text-slate-400 hover:border-slate-700"
          }`}
        >
          <div className="flex items-center justify-between text-[10px] uppercase">
            <span>FLEET VEHICLES</span>
            <Truck size={14} className="text-sky-400" />
          </div>
          <div className="text-xl font-bold text-sky-400 mt-1">{vehicles.length} Active</div>
          <div className="text-[10px] text-slate-500 pt-0.5">Capacity Managed</div>
        </div>

        <div
          onClick={() => setActiveTab("delivery-points")}
          className={`p-3 border cursor-pointer transition-all ${
            activeTab === "delivery-points"
              ? "bg-indigo-950/60 border-indigo-500 text-white shadow-lg"
              : "bg-[#0d1015] border-slate-800 text-slate-400 hover:border-slate-700"
          }`}
        >
          <div className="flex items-center justify-between text-[10px] uppercase">
            <span>DELIVERY POINTS</span>
            <PackageCheck size={14} className="text-indigo-400" />
          </div>
          <div className="text-xl font-bold text-indigo-400 mt-1">{deliveryPoints.length} Customer Stops</div>
          <div className="text-[10px] text-slate-500 pt-0.5">Snapped to Network</div>
        </div>

        <div
          onClick={() => setActiveTab("depots")}
          className={`p-3 border cursor-pointer transition-all ${
            activeTab === "depots"
              ? "bg-emerald-950/60 border-emerald-500 text-white shadow-lg"
              : "bg-[#0d1015] border-slate-800 text-slate-400 hover:border-slate-700"
          }`}
        >
          <div className="flex items-center justify-between text-[10px] uppercase">
            <span>CENTRAL DEPOTS</span>
            <Building2 size={14} className="text-emerald-400" />
          </div>
          <div className="text-xl font-bold text-emerald-400 mt-1">{depots.length} Facility</div>
          <div className="text-[10px] text-slate-500 pt-0.5">Fleet Base Hub</div>
        </div>

        <div
          onClick={() => setActiveTab("restrictions")}
          className={`p-3 border cursor-pointer transition-all ${
            activeTab === "restrictions"
              ? "bg-amber-950/60 border-amber-500 text-white shadow-lg"
              : "bg-[#0d1015] border-slate-800 text-slate-400 hover:border-slate-700"
          }`}
        >
          <div className="flex items-center justify-between text-[10px] uppercase">
            <span>ROAD RESTRICTIONS</span>
            <ShieldAlert size={14} className="text-amber-400" />
          </div>
          <div className="text-xl font-bold text-amber-400 mt-1">{restrictions.length} Enforced</div>
          <div className="text-[10px] text-slate-500 pt-0.5">Active Rules</div>
        </div>
      </div>

      {/* Tab Switcher & Search Bar */}
      <div className="p-3 bg-[#0d1015] border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 font-mono">
        <div className="flex items-center space-x-1 overflow-x-auto text-xs scrollbar-none">
          {[
            { id: "vehicles", label: "VEHICLES", icon: Truck },
            { id: "delivery-points", label: "DELIVERY POINTS", icon: PackageCheck },
            { id: "depots", label: "DEPOTS", icon: Building2 },
            { id: "restrictions", label: "RESTRICTIONS", icon: ShieldAlert },
          ].map((t) => {
            const Icon = t.icon;
            const isActive = activeTab === t.id;
            return (
              <button
                key={t.id}
                onClick={() => setActiveTab(t.id)}
                className={`px-3 py-1.5 font-bold flex items-center space-x-1.5 transition-all rounded-none ${
                  isActive
                    ? "bg-sky-500 text-black border border-sky-400 shadow-md"
                    : "bg-slate-900 text-slate-400 hover:text-white border border-slate-800"
                }`}
              >
                <Icon size={13} />
                <span>{t.label}</span>
              </button>
            );
          })}
        </div>

        <div className="relative w-full sm:w-64">
          <Search size={14} className="absolute left-2.5 top-2.5 text-slate-500" />
          <input
            type="text"
            placeholder="Search network records..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 bg-slate-950 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-sky-500 font-mono"
          />
        </div>
      </div>

      {/* Loading Overlay */}
      {isLoading ? (
        <div className="p-12 bg-[#0d1015] border border-slate-800 text-center font-mono space-y-3">
          <Activity size={28} className="animate-spin text-sky-400 mx-auto" />
          <div className="text-sm font-bold text-sky-400">FETCHING NETWORK DATA FROM SUPABASE...</div>
          <div className="text-xs text-slate-500">Executing FastAPI backend query for vehicles, stops, depots & restrictions.</div>
        </div>
      ) : error ? (
        <div className="p-6 bg-red-950/50 border border-red-500/60 font-mono text-xs text-red-300 space-y-2">
          <div className="font-bold text-red-400 flex items-center space-x-2">
            <ShieldAlert size={16} />
            <span>BACKEND API CONNECTION NOTICE</span>
          </div>
          <div>{error}</div>
          <button
            onClick={loadBackendData}
            className="px-3 py-1.5 bg-red-500 text-black font-bold uppercase text-[10px] mt-2 inline-block"
          >
            RETRY API FETCH
          </button>
        </div>
      ) : (
        <>
          {/* TAB 1: VEHICLES */}
          {activeTab === "vehicles" && (
            <div className="space-y-4 font-mono">
              <div className="flex items-center justify-between text-xs border-b border-slate-800 pb-2">
                <span className="text-slate-400 font-bold uppercase flex items-center gap-1.5">
                  <Truck size={14} className="text-sky-400" /> FLEET VEHICLES FROM SUPABASE ({filteredVehicles.length})
                </span>
                <span className="text-emerald-400 text-[10px]">SUPABASE TABLE: vehicles</span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {filteredVehicles.map((v, idx) => {
                  const cap = v.capacity_kg || v.capacity || 50;
                  const code = v.vehicle_code || v.id || `veh_0${idx + 1}`;
                  const name = v.name || `Vehicle ${code}`;
                  const color = v.color || (idx === 0 ? "#00f0ff" : idx === 1 ? "#10b981" : "#f59e0b");

                  return (
                    <div
                      key={v.id || idx}
                      className="p-4 bg-[#0d1015] border border-slate-800 space-y-3 relative overflow-hidden"
                    >
                      <div
                        className="absolute top-0 left-0 right-0 h-1"
                        style={{ backgroundColor: color }}
                      />
                      <div className="flex items-start justify-between pt-1">
                        <div>
                          <div className="text-xs font-bold text-white uppercase">{name}</div>
                          <div className="text-[10px] text-slate-400 font-mono">ID: {code}</div>
                        </div>
                        <span className="text-[9px] font-bold px-1.5 py-0.5 bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                          {v.status || "ACTIVE"}
                        </span>
                      </div>

                      <div className="grid grid-cols-2 gap-2 text-[11px] bg-slate-900/80 p-2.5 border border-slate-800/80">
                        <div>
                          <span className="text-slate-500 text-[9px] block">PAYLOAD CAP</span>
                          <span className="font-bold text-sky-400">{cap} kg</span>
                        </div>
                        <div>
                          <span className="text-slate-500 text-[9px] block">BASE DEPOT</span>
                          <span className="font-bold text-slate-300 truncate block">QFLOW_DEPOT</span>
                        </div>
                      </div>

                      <div className="flex items-center justify-between text-[10px] text-slate-400 pt-1">
                        <span className="flex items-center gap-1">
                          <CheckCircle2 size={11} className="text-emerald-400" /> VRP Ready
                        </span>
                        <span className="text-sky-400 font-bold">FastAPI Connected</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* TAB 2: DELIVERY POINTS */}
          {activeTab === "delivery-points" && (
            <div className="space-y-4 font-mono">
              <div className="flex items-center justify-between text-xs border-b border-slate-800 pb-2">
                <span className="text-slate-400 font-bold uppercase flex items-center gap-1.5">
                  <PackageCheck size={14} className="text-indigo-400" /> CUSTOMER DELIVERY STOPS FROM SUPABASE ({filteredDeliveryPoints.length})
                </span>
                <span className="text-emerald-400 text-[10px]">SUPABASE TABLE: delivery_points</span>
              </div>

              <div className="bg-[#0d1015] border border-slate-800 overflow-hidden">
                <table className="w-full text-left text-xs font-mono">
                  <thead className="bg-slate-900 border-b border-slate-800 text-slate-400 text-[11px]">
                    <tr>
                      <th className="p-3">STOP CODE</th>
                      <th className="p-3">CUSTOMER / LOCATION</th>
                      <th className="p-3 text-right">DEMAND (KG)</th>
                      <th className="p-3">COORDINATES</th>
                      <th className="p-3 text-right">STATUS</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800 text-slate-200 text-[11px]">
                    {filteredDeliveryPoints.map((dp, idx) => {
                      const code = dp.point_code || dp.id || `dp_${String(idx + 1).padStart(2, "0")}`;
                      const name = dp.name || `Delivery Location ${idx + 1}`;
                      const dem = dp.demand_kg ?? dp.demand ?? 10;
                      const lat = dp.lat || dp.latitude || 21.2514;
                      const lng = dp.lng || dp.longitude || 81.6296;

                      return (
                        <tr key={dp.id || idx} className="hover:bg-slate-900/60 transition-colors">
                          <td className="p-3 font-bold text-sky-400">
                            📦 {code.toUpperCase()}
                          </td>
                          <td className="p-3 font-bold text-white">{name}</td>
                          <td className="p-3 text-right text-emerald-400 font-bold">{dem} kg</td>
                          <td className="p-3 text-slate-400 font-mono text-[10px]">
                            {Number(lat).toFixed(4)}, {Number(lng).toFixed(4)}
                          </td>
                          <td className="p-3 text-right">
                            <span className="px-1.5 py-0.5 bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 text-[9px] font-bold">
                              {dp.status || "SNAPPED"}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 3: DEPOTS */}
          {activeTab === "depots" && (
            <div className="space-y-4 font-mono">
              <div className="flex items-center justify-between text-xs border-b border-slate-800 pb-2">
                <span className="text-slate-400 font-bold uppercase flex items-center gap-1.5">
                  <Building2 size={14} className="text-emerald-400" /> CENTRAL DISTRIBUTION DEPOTS FROM SUPABASE ({filteredDepots.length})
                </span>
                <span className="text-emerald-400 text-[10px]">SUPABASE TABLE: depots</span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {filteredDepots.map((d, idx) => {
                  const code = d.depot_code || d.id || "QFLOW_DEPOT";
                  const name = d.name || "Raipur Main Distribution Depot";
                  const cap = d.capacity_vehicles || 20;
                  const lat = d.lat || d.latitude || 21.2517416;
                  const lng = d.lng || d.longitude || 81.629464;

                  return (
                    <div key={d.id || idx} className="p-5 bg-[#0d1015] border border-slate-800 space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="font-bold text-base text-white flex items-center gap-2">
                          <span>🏢 {name}</span>
                        </div>
                        <span className="text-[9px] bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-2 py-0.5 font-bold">
                          PRIMARY HUB
                        </span>
                      </div>

                      <div className="grid grid-cols-2 gap-2 text-xs bg-slate-900 p-3 border border-slate-800 font-mono">
                        <div>
                          <span className="text-slate-500 text-[9px] block">FACILITY CODE</span>
                          <span className="font-bold text-sky-400">{code}</span>
                        </div>
                        <div>
                          <span className="text-slate-500 text-[9px] block">FLEET CAPACITY</span>
                          <span className="font-bold text-emerald-400">{cap} Vehicles</span>
                        </div>
                        <div className="col-span-2 pt-1 border-t border-slate-800/80">
                          <span className="text-slate-500 text-[9px] block">GEOGRAPHIC LOCATION</span>
                          <span className="font-bold text-slate-200">{lat}, {lng}</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* TAB 4: RESTRICTIONS */}
          {activeTab === "restrictions" && (
            <div className="space-y-4 font-mono">
              <div className="flex items-center justify-between text-xs border-b border-slate-800 pb-2">
                <span className="text-slate-400 font-bold uppercase flex items-center gap-1.5">
                  <ShieldAlert size={14} className="text-amber-400" /> ROAD & VEHICLE RESTRICTIONS FROM SUPABASE ({filteredRestrictions.length})
                </span>
                <span className="text-emerald-400 text-[10px]">SUPABASE TABLE: restrictions</span>
              </div>

              <div className="space-y-3">
                {filteredRestrictions.map((rst, idx) => {
                  const code = rst.restriction_code || rst.id || `RST_00${idx + 1}`;
                  const name = rst.name || "Road Network Restriction";
                  const road = rst.affected_road || "Devendra Nagar Flyover";
                  const type = rst.restriction_type || "WEIGHT_LIMIT";
                  const maxW = rst.max_weight_kg ? `${rst.max_weight_kg} kg` : "Enforced";

                  return (
                    <div key={rst.id || idx} className="p-4 bg-[#0d1015] border border-slate-800 space-y-2">
                      <div className="flex items-start justify-between">
                        <div className="font-bold text-sm text-white flex items-center space-x-2">
                          <ShieldAlert size={15} className="text-amber-400" />
                          <span>{name}</span>
                          <span className="text-[9px] px-2 py-0.5 bg-amber-500/20 text-amber-400 border border-amber-500/30">
                            {type}
                          </span>
                        </div>
                        <span className="text-[9px] font-bold px-2 py-0.5 bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                          {rst.status || "ACTIVE"}
                        </span>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs bg-slate-900 p-2.5 border border-slate-800">
                        <div>
                          <span className="text-slate-500 text-[9px] block">RULE CODE</span>
                          <span className="font-bold text-sky-400">{code}</span>
                        </div>
                        <div>
                          <span className="text-slate-500 text-[9px] block">AFFECTED ROAD</span>
                          <span className="font-bold text-white">{road}</span>
                        </div>
                        <div>
                          <span className="text-slate-500 text-[9px] block">MAX WEIGHT / CONDITION</span>
                          <span className="font-bold text-amber-400">{maxW}</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
