# Q-FLOW — Real-Time Vehicle Tracking & Dynamic Route Optimization

Q-FLOW is a real-time vehicle tracking and dynamic route optimization platform.
Real GPS telemetry flows through the backend, is map-matched against an OSM road
network, feeds a live traffic engine, drives dynamic routing, and is optimized
by a Quantum-Inspired Particle Swarm (QPSO) decision layer.

**The most important rule of this project:** the system never pretends to be
real-time when it is not. Every data point on screen carries its provenance.

## Data Modes

| Mode | Source | Labelling |
|------|--------|-----------|
| **LIVE** | Real GPS telemetry (Android tracker / GPS gateway / Traccar) + optional external traffic provider | `LIVE DATA` badges |
| **SIMULATION** | SUMO (TraCI) or the deterministic simulation generator — same pipeline, `source=sumo` | `SIMULATION` badges |
| **TEST** | Deterministic fixtures (pytest integration tests, VRP demo dataset) | `TEST DATA` badges |

The backend **refuses** to run SUMO in live mode (`DATA_MODE=live` returns 409
from `/api/v1/simulation/start`) and never silently falls back from live data to
fake data. When no telemetry exists the UI literally shows
**"NO LIVE VEHICLE DATA"** / **"TRAFFIC DATA UNAVAILABLE"**.

---

## 1. Architecture

```mermaid
flowchart LR
    A[Android GPS Tracker / Traccar] -->|HTTPS POST PositionEvent| B[Telemetry Ingestion API]
    S[SUMO SimulationAdapter<br/>SIMULATION mode only] -->|PositionEvent| B
    B --> C{GPS Validation<br/>jumps · speeds · staleness}
    C -->|accepted| D[(vehicle_positions<br/>raw GPS history)]
    C -->|accepted| E[OSM Map Matcher<br/>8.7k-edge spatial index]
    E --> F[Live Traffic Engine<br/>median + outlier rejection<br/>min samples · TTL]
    E --> G[Vehicle Current State<br/>LIVE/DEGRADED/STALE/OFFLINE]
    F --> H[Dynamic Routing Graph<br/>live edge costs]
    I[Incident Engine<br/>MANUAL / PROVIDER / FLEET_ANOMALY] --> H
    H --> J[QPSO Route Selector<br/>multi-objective cost]
    J --> K{Reroute Thresholds<br/>≥120s gain · ≥8% · 30s cooldown}
    K -->|reroute| L[(reroute_log)] 
    K --> M[route_update event]
    G --> N[WebSocket /ws/live]
    F --> N
    I --> N
    M --> N
    N --> O[React + MapLibre Dashboard<br/>live vehicles · traffic colors ·<br/>incidents · routes · ETAs]
    D --> P[(PostgreSQL / Supabase)]
    F --> P
    L --> P
```

### Pipeline (identical for LIVE and SIMULATION)

```
PositionEvent → validate → persist raw fix → map-match to OSM edge
  → update vehicle state → traffic observation → [10 s batch] traffic recompute
  → incremental graph cost update → incident anomaly check
  → [20 s batch, event-driven] QPSO candidate evaluation → reroute decision
  → route_update broadcast
```

GPS ingestion is never blocked by QPSO — optimization runs in separate
event-driven cycles over batched traffic updates.

---

## 2. Prerequisites

- **Python 3.12+** (`py -3.12` on Windows)
- **Node.js 20+** and **pnpm 10** (frontend)
- **PostgreSQL** (local) or a **Supabase** project
- **SUMO** (optional — only for real SUMO simulation; a deterministic generator
  substitutes when the binary is absent, still labelled SIMULATION)
- **Android Studio** (optional — to build the GPS tracker app)

## 3. Installation

```bash
# Backend
cd backend
py -3.12 -m venv .venv && .venv\Scripts\activate     # Windows
pip install -r requirements.txt

# Frontend
cd frontend
pnpm install
```

## 4. Environment Variables

Copy `backend/.env.example` → `backend/.env` and fill in:

| Variable | Purpose |
|----------|---------|
| `DATA_MODE` | `live` \| `simulation` \| `test` — controls the entire data source |
| `DATABASE_URL` | PostgreSQL/Supabase connection string (`postgresql+asyncpg://user:pass@host:port/db`) |
| `SUPABASE_URL` / `SUPABASE_ANON_KEY` / `SUPABASE_SERVICE_ROLE_KEY` | Supabase (optional; enables demo scenario + REST persistence fallbacks). **Never commit real values** |
| `GPS_AUTH_SECRET` | Shared device secret; telemetry devices send `Authorization: Bearer <secret>`. **Required in production** |
| `TRAFFIC_PROVIDER` | `none` \| `google` \| `mapbox`; `TRAFFIC_API_KEY` for the provider |
| `REDIS_URL` | Optional cache/rate-limit backend |
| `REROUTE_MIN_ETA_GAIN_S` / `REROUTE_MIN_IMPROVEMENT_PCT` / `REROUTE_COOLDOWN_S` | Rerouting thresholds (Section 14) |
| `QPSO_*` | Optimizer population, iterations, β, incident/route-change penalties |
| `SUMO_BINARY` / `SUMO_CONFIG_FILE` | Real SUMO integration (simulation mode) |

Frontend: copy `frontend/.env.example` → `frontend/.env` (API base URL, WS URL,
Supabase **anon** key only).

## 5. Database Setup (PostgreSQL/Supabase)

```bash
cd backend
# 1. Core domain schema (idempotent)
py -3.12 apply_migration.py
# 2. Realtime telemetry schema (vehicle_positions, live columns,
#    traffic_edge_states, incident lifecycle, reroute_log)
py -3.12 -c "
import asyncio, asyncpg, os
from pathlib import Path
from dotenv import load_dotenv
load_dotenv(Path('.env'))
url = os.getenv('DATABASE_URL','').replace('postgresql+asyncpg://','postgresql://')
sql = Path('realtime_schema.sql').read_text(encoding='utf-8')
async def run():
    conn = await asyncpg.connect(url, timeout=30)
    await conn.execute(sql)
    await conn.close()
    print('realtime schema applied')
asyncio.run(run())
"
```

`realtime_schema.sql` is additive and idempotent — existing tables and columns
are preserved. For Supabase, alternatively paste both SQL files into the
Supabase SQL editor.

## 6. OSM Network Import

The Raipur network auto-loads from `frontend/raipur-osm.json` (4,692 nodes /
8,731 edges). For other cities (OSMnx installed):

```bash
curl -X POST http://localhost:8000/api/v1/networks/osm/import \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <supabase-jwt>" \
  -d '{"city": "Raipur, India", "network_type": "drive"}'
```

The map matcher and dynamic routing graph index whatever graph
`build_osm_road_network(city)` produces — no hard-coded roads or edge IDs.

## 7. Traffic Provider Setup

- `TRAFFIC_PROVIDER=none` (default): fleet GPS only — fully functional.
- `TRAFFIC_PROVIDER=google`: set `TRAFFIC_API_KEY`; Distance-Matrix traffic
  ratios feed the fusion engine, throttled + cached (`TRAFFIC_PROVIDER_CACHE_TTL_S`).
- `TRAFFIC_PROVIDER=mapbox`: set `TRAFFIC_API_KEY`; Directions-Matrix durations.

Provider observations are stored with `source=EXTERNAL` / `provider=<name>` and
are **never presented as fleet GPS**; the UI exposes provenance and freshness.

## 8. Android Tracker Setup

See `android-tracker/README.md`. Summary:

1. Open `android-tracker/` in Android Studio, build, install on a phone.
2. Set the backend URL in `TelemetryApiClient.kt` (HTTPS in production).
3. Enter the vehicle ID (e.g. `V-001`) and `GPS_AUTH_SECRET`.
4. Tap **START TRACKING**; the foreground service streams GPS fixes and queues
   them during connectivity loss (batch upload + exponential backoff retry).

## 9. Running LIVE Mode

```bash
# backend/.env → DATA_MODE=live
cd backend && py -3.12 -m uvicorn app.main:app --port 8000
cd frontend && pnpm dev            # → http://localhost:3000
```

Send real telemetry (from the tracker or any GPS source):

```bash
curl -X POST http://localhost:8000/api/v1/telemetry/position \
  -H "Authorization: Bearer $GPS_AUTH_SECRET" \
  -H "Content-Type: application/json" \
  -d '{"vehicle_id":"V-001","timestamp":"2026-09-12T17:18:23Z",
       "latitude":21.256781,"longitude":81.641223,"speed_kmh":37.4,
       "heading_deg":84.2,"accuracy_m":5.8,"source":"android"}'
```

The vehicle appears on the map within one WebSocket frame — no refresh.

## 10. Running SUMO SIMULATION Mode

```bash
# backend/.env → DATA_MODE=simulation  (SUMO_CONFIG_FILE=/path/to/osm.sumocfg for real SUMO)
# then POST /api/v1/simulation/start
```

Use the **Simulation** page in the dashboard: START/STOP controls, authoritative
status (running/vehicleCount/sim time from the backend), and the live map fed by
`source=sumo` telemetry with `SIMULATION` badges throughout.

## 11. Running TEST Mode

```bash
cd backend && py -3.12 -m pytest tests/ -q        # 66 tests, deterministic fixtures
```

TEST fixtures exist only inside the test-suite/VRP demo endpoints — they are
never used as a LIVE fallback.

## 12. API Endpoints

### Telemetry
| Method | Path | Purpose |
|--------|------|---------|
| POST | `/api/v1/telemetry/position` | Ingest one GPS fix (all providers) |
| POST | `/api/v1/telemetry/position/batch` | Ingest queued fixes (offline trackers) |

### Vehicles
| Method | Path | Purpose |
|--------|------|---------|
| GET | `/api/v1/vehicles` | REST snapshot of live fleet state |
| GET | `/api/v1/vehicles/{id}` | Vehicle detail panel data (all real values) |
| GET | `/api/v1/vehicles/{id}/positions` | GPS position history |
| POST | `/api/v1/vehicles/{id}/destination` | Assign destination → builds live route |
| POST | `/api/v1/vehicles/{id}/reroute` | Dispatcher-triggered immediate reroute |

### Traffic / Incidents / Optimization / System
| Method | Path | Purpose |
|--------|------|---------|
| GET | `/api/v1/traffic/edges` | Live per-edge traffic state (UNKNOWN when unsampled) |
| GET/POST | `/api/v1/incidents` | List / create incidents (edge mapping is dynamic) |
| POST | `/api/v1/incidents/{id}/confirm` · `/resolve` | Lifecycle transitions |
| GET | `/api/v1/routes/{vehicle_id}` | Current route for a vehicle |
| GET | `/api/v1/optimization/runs` | QPSO experimental metrics |
| GET | `/api/v1/optimization/reroutes` | Reroute decision log (measured ETAs) |
| GET | `/api/v1/system/status` | Subsystem health + freshness |
| GET | `/api/health` · `/health` | Liveness |
| GET | `/api/v1/simulation/status` · POST `/start` `/stop` | Authoritative SUMO status |
| WS | `/ws/live` | Realtime: `vehicle_position`, `vehicle_status`, `traffic_update`, `incident_created/updated`, `route_update`, `optimization_complete` |

Legacy endpoints (`/dashboards/*`, `/networks/*`, `/optimization/demo`, …)
remain untouched for backward compatibility.

## 13. QPSO Algorithm

The QPSO layer operates in two places, both driven by live network state:

1. **Fleet VRP (planning)** — `app/optimization/discrete_qpso.py`: quantum-behaved
   particle swarm over delivery permutations with contraction coefficient
   β, swap-toward-personal/global-best operators, and multi-objective fitness
   `time + 0.5·distance + 500·capacity_violations`. Baseline greedy solver is
   compared with **measured** improvement percentages only.
2. **Live route selection (per vehicle)** — `app/routing/qpso_selector.py`:
   builds candidate routes from the dynamic graph (dynamic shortest path,
   free-flow path, congestion-avoiding detours), then a quantum-inspired swarm
   selects the optimum with cost:
   `dynamic_time + congestion_penalty + incident_penalty + distance_weight
   + route_change_penalty·(1 − overlap)`.

Every run is persisted to `optimization_runs` (vehicles_considered, iterations,
population, best_cost, computation_time_ms, routes_changed, data_mode).
`get_raipur_demo_dataset()` is only reachable from the explicitly-labelled demo
endpoints — live optimization always reads current network state.

## 14. Traffic Calculation

Per edge, observations (vehicle GPS map-matched to that edge + provider data)
are aggregated with:
- **minimum sample threshold** (`TRAFFIC_MIN_SAMPLES`, default 3) — else UNKNOWN
- **median** speed with MAD-based **outlier rejection** (2.5σ) — one glitching
  GPS never fabricates congestion
- **TTL expiry** (`TRAFFIC_OBSERVATION_TTL_S`) — stale observations expire
- **confidence** = f(sample count, spread)

Then: `congestion_ratio = observed / free_flow`,
`travel_time = length / max(observed, min_speed)`, and classification
GREEN ≥ 0.75 > YELLOW ≥ 0.5 > ORANGE ≥ 0.3 > RED (BLOCKED for incidents).

## 15. Map Matching

`app/network/map_matching.py` indexes every OSM edge into a 120 m spatial grid.
Each GPS fix: candidate edges → perpendicular distance along the polyline →
scoring by distance + heading compatibility + speed compatibility + previous-edge
continuity → best match with `matched_edge_id`, `matched_edge_fraction`,
`distance_from_edge`, `confidence`. Low accuracy widens the search radius;
stopped vehicles, intersections, parallel lanes and U-turns are handled by the
scoring model. Nothing is hard-coded.

## 16. Rerouting Logic

Reroute only when **all** hold (configurable):
new ETA < current ETA − `REROUTE_MIN_ETA_GAIN_S` (120 s),
improvement ≥ `REROUTE_MIN_IMPROVEMENT_PCT` (8 %), vehicle not at a maneuver,
not rerouted within `REROUTE_COOLDOWN_S` (30 s).

Immediate triggers bypass thresholds: confirmed closure, severe accident,
blocked edge on current route, vehicle off-route. Every reroute writes
`reroute_log` (vehicle, old/new route, old/new ETA, improvement, reason,
optimization_run_id) and emits `route_update` to vehicles.

## 17. Deployment

- **Frontend** → Vercel/Netlify: build `frontend` (`vite build` → `dist/public`),
  set `VITE_API_BASE_URL=https://<backend>/api/v1` and `VITE_WS_BASE_URL=wss://<backend>`.
- **Backend** → Render/Railway/Fly: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`;
  set all env vars including `GPS_AUTH_SECRET`. WebSocket passthrough required.
- **Database** → Supabase: run both SQL schemas; use the pooler connection string
  (username `postgres.<project-ref>`).
- **HTTPS** is required for device telemetry (`usesCleartextTraffic=false` in the tracker).

## 18. Security Considerations

- Service-role keys exist **only** in backend env — never shipped to the frontend
  (the frontend uses the anon key solely for auth).
- Telemetry ingestion authenticates via `GPS_AUTH_SECRET` (or Supabase JWT);
  in production an unset secret disables anonymous ingestion.
- Per-vehicle rate limiting on telemetry; payload validation via Pydantic bounds.
- No secrets are committed: `backend/.env` is git-ignored; `.env.example` files
  contain placeholders only.
- RLS policies mirror org isolation for new tables (`realtime_schema.sql`).

## What is REAL vs SIMULATION

| Capability | Status |
|-----------|--------|
| GPS ingestion + validation (jumps/speed/staleness) | **Real** |
| Raw telemetry storage + position history | **Real** |
| OSM map matching (whole network, spatial index) | **Real** |
| Vehicle LIVE/DEGRADED/STALE/OFFLINE ladder | **Real** |
| Live traffic engine (robust aggregation, UNKNOWN when unsampled) | **Real** |
| Incident lifecycle + fleet anomaly detection | **Real** |
| Dynamic routing costs + vehicle-specific ETA | **Real** |
| QPSO selection + threshold-guarded rerouting + audit log | **Real** |
| WebSocket realtime dashboard updates | **Real** |
| External traffic providers (Google/Mapbox adapters) | **Real** (requires API key) |
| SUMO TraCI adapter | **Simulation** (labelled, live mode refuses it) |
| Deterministic simulation generator | **Simulation** (fallback when SUMO binary absent) |
| VRP demo dataset / benchmark page | **Test** (explicitly labelled TEST DATA) |
