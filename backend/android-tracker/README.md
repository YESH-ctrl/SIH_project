# Q-FLOW Android GPS Tracker

A minimal, production-usable Android tracker module for an ordinary phone.
It streams real GPS telemetry to the Q-FLOW backend.

```
android-tracker/
└── app/
    ├── build.gradle.kts
    └── src/main/
        ├── AndroidManifest.xml
        ├── res/values/strings.xml
        └── java/io/qflow/tracker/
            ├── MainActivity.kt        (permission flow, connection state UI, vehicle ID)
            ├── TrackerService.kt      (foreground service: GPS collection + upload queue)
            ├── TelemetryApiClient.kt  (HTTP client: single + batch upload, retry/backoff)
            └── TelemetryModels.kt     (JSON payload matching POST /api/v1/telemetry/position)
```

## Behaviour

- **Permissions**: requests `FINE_LOCATION`/`COARSE_LOCATION` at runtime; `POST_NOTIFICATIONS` on 13+.
- **Foreground service**: continuous collection with a persistent notification; keeps GPS alive with the screen off.
- **Collection**: latitude, longitude, speed (m/s → km/h), bearing (heading), accuracy, altitude.
- **Queueing**: fixes are stored while offline and uploaded as a batch
  (`POST /api/v1/telemetry/position/batch`) when connectivity returns — the backend validates each
  queued fix independently, so temporary gaps never fabricate data.
- **Retry**: exponential backoff (2 s → 60 s) on HTTP failures or unreachable backend.
- **Auth**: sends `Authorization: Bearer <GPS_AUTH_SECRET>` (the shared device secret from the backend `.env`).
- **Vehicle identity**: the operator types the vehicle code (e.g. `V-001`) once; it is persisted and stamped onto every fix.

## Build & run

```bash
# 1. Point the tracker at your backend
#    android-tracker/app/src/main/java/io/qflow/tracker/TelemetryApiClient.kt
#    → private const val DEFAULT_BASE_URL = "https://your-backend.example.com"
#      (must be HTTPS for real deployment; http://10.0.2.2:8000 works for the emulator)

# 2. Open android-tracker/ in Android Studio (or):
cd android-tracker && ./gradlew :app:assembleDebug
adb install app/build/outputs/apk/debug/app-debug.apk

# 3. In the app:
#    - enter vehicle ID (e.g. V-001)
#    - enter GPS_AUTH_SECRET from backend/.env
#    - tap START TRACKING and grant location permission
```

The dashboard map shows the vehicle as soon as the first fix passes validation.
Speeds seen on the map are the phone's actual GPS speed; road matching is done
server-side against the OSM network.

> GPS note: first fix can take 30–60 s outdoors. The tracker keeps a wake-locked
> foreground service so the fix cadence stays steady while driving.
