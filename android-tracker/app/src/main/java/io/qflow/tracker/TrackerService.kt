package io.qflow.tracker

import android.annotation.SuppressLint
import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.app.Service
import android.content.Context
import android.content.Intent
import android.location.Location
import android.location.LocationListener
import android.location.LocationManager
import android.os.Binder
import android.os.Build
import android.os.Handler
import android.os.HandlerThread
import android.os.IBinder
import android.os.Looper
import java.util.ArrayDeque

/**
 * Foreground GPS service: collects real fixes and uploads them with queue +
 * retry. One fix per GPS_UPDATE_INTERVAL_MS; queued fixes are flushed as a
 * batch when the connection recovers.
 */
class TrackerService : Service(), LocationListener {

    inner class LocalBinder : Binder() { val service: TrackerService get() = this@TrackerService }

    private val binder = LocalBinder()
    var listener: ((Unit) -> Unit)? = null

    private lateinit var locationManager: LocationManager
    private lateinit var workerThread: HandlerThread
    private lateinit var workerHandler: Handler
    private val queue = ArrayDeque<TelemetryModels.PositionPayload>()
    private val client = TelemetryApiClient()

    var isRunning = false; private set
    var stateName = "STOPPED"; private set
    var lastFixSummary: String? = null; private set
    var lastAckSummary: String? = null; private set

    private val vehicleId: String
        get() = getSharedPreferences("qflow_tracker", Context.MODE_PRIVATE)
            .getString(MainActivity.KEY_VEHICLE_ID, "") ?: ""

    private val secret: String
        get() = getSharedPreferences("qflow_tracker", Context.MODE_PRIVATE)
            .getString(MainActivity.KEY_SECRET, "") ?: ""

    override fun onCreate() {
        super.onCreate()
        locationManager = getSystemService(Context.LOCATION_SERVICE) as LocationManager
        workerThread = HandlerThread("qflow-telemetry")
        workerThread.start()
        workerHandler = Handler(workerThread.looper)
    }

    override fun onBind(intent: Intent?): IBinder = binder

    @SuppressLint("MissingPermission")
    fun startTracking() {
        val channelId = "qflow_tracking"
        val nm = getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
        if (Build.VERSION.SDK_INT >= 26) {
            nm.createNotificationChannel(
                NotificationChannel(channelId, "Q-FLOW Tracking", NotificationManager.IMPORTANCE_LOW)
            )
        }
        val notification: Notification = Notification.Builder(this, channelId)
            .setContentTitle("Q-FLOW GPS tracking active")
            .setContentText("Streaming telemetry for $vehicleId")
            .setSmallIcon(android.R.drawable.ic_menu_mylocation)
            .setContentIntent(
                PendingIntent.getActivity(
                    this, 0, Intent(this, MainActivity::class.java),
                    PendingIntent.FLAG_IMMUTABLE
                )
            )
            .build()
        startForeground(1, notification)

        // Request GPS updates: 2 s min time, 2 m min distance.
        val provider = LocationManager.GPS_PROVIDER
        val intervalMs = 2000L
        try {
            locationManager.requestLocationUpdates(provider, intervalMs, 2f, this, Looper.getMainLooper())
        } catch (e: IllegalArgumentException) {
            // GPS provider unavailable (airplane mode) — network provider fallback
            locationManager.requestLocationUpdates(
                LocationManager.NETWORK_PROVIDER, intervalMs, 5f, this, Looper.getMainLooper()
            )
        }
        isRunning = true
        stateName = "TRACKING"
        notifyChanged()
    }

    fun stopForegroundService() {
        locationManager.removeUpdates(this)
        isRunning = false
        stateName = "STOPPED"
        stopForeground(STOP_FOREGROUND_REMOVE)
        stopSelf()
        notifyChanged()
    }

    override fun onLocationChanged(location: Location) {
        val payload = TelemetryModels.PositionPayload(
            vehicle_id = vehicleId,
            timestamp = TelemetryModels.isoNow(),
            latitude = location.latitude,
            longitude = location.longitude,
            speed_kmh = if (location.hasSpeed()) (location.speed * 3.6) else null,
            heading_deg = if (location.hasBearing()) location.bearing.toDouble() else null,
            accuracy_m = if (location.hasAccuracy()) location.accuracy.toDouble() else null,
            altitude_m = if (location.hasAltitude()) location.altitude else null,
            source = "android"
        )
        lastFixSummary = "%.5f, %.5f @ %.0f km/h".format(payload.latitude, payload.longitude, payload.speed_kmh ?: 0.0)
        synchronized(queue) { queue.addLast(payload) }
        workerHandler.post { flush() }
        notifyChanged()
    }

    /** Upload queued fixes: single for 1, batch for >1. Exponential backoff. */
    private fun flush() {
        var backoffMs = 2000L
        while (true) {
            val batch: List<TelemetryModels.PositionPayload>
            synchronized(queue) {
                if (queue.isEmpty()) return
                batch = queue.toList()
            }
            val ok = try {
                val acks = client.upload(secret, batch)
                lastAckSummary = if (acks.isNotEmpty())
                    "edge=${acks.first().matched_edge_id ?: "?"} status=${acks.first().tracking_status}"
                else "batch accepted"
                true
            } catch (e: Exception) {
                lastAckSummary = "upload failed: ${e.message?.take(60)}"
                false
            }
            if (ok) {
                synchronized(queue) { repeat(batch.size) { queue.pollFirst() } }
                notifyChanged()
                return
            }
            // connection trouble: stop draining, retry with backoff, cap the queue
            Thread.sleep(backoffMs)
            backoffMs = (backoffMs * 2).coerceAtMost(60_000L)
            synchronized(queue) { while (queue.size > 500) queue.pollFirst() }
        }
    }

    private fun notifyChanged() { listener?.invoke(Unit) }

    override fun onDestroy() {
        locationManager.removeUpdates(this)
        workerThread.quitSafely()
        super.onDestroy()
    }

    // Unused LocationListener callbacks (API < 29 compatibility)
    override fun onStatusChanged(p: String?, status: Int, extras: Bundle?) {}
    override fun onProviderEnabled(p: String?) { stateName = "TRACKING"; notifyChanged() }
    override fun onProviderDisabled(p: String?) { stateName = "GPS DISABLED"; notifyChanged() }
}
