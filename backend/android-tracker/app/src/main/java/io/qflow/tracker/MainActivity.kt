package io.qflow.tracker

import android.Manifest
import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.content.ServiceConnection
import android.content.pm.PackageManager
import android.os.Build
import android.os.Bundle
import android.os.IBinder
import android.widget.Button
import android.widget.EditText
import android.widget.LinearLayout
import android.widget.TextView
import android.widget.Toast
import androidx.appcompat.app.AppCompatActivity
import androidx.core.app.ActivityCompat
import androidx.core.content.ContextCompat

/**
 * Q-FLOW tracker UI: vehicle ID + secret entry, permission flow, start/stop,
 * and live connection status. Real telemetry only — the app displays exactly
 * what the backend acknowledges.
 */
class MainActivity : AppCompatActivity() {

    private var service: TrackerService? = null
    private var bound = false

    private lateinit var vehicleIdInput: EditText
    private lateinit var secretInput: EditText
    private lateinit var statusText: TextView
    private lateinit var toggleButton: Button

    private val connection = object : ServiceConnection {
        override fun onServiceConnected(name: ComponentName?, binder: IBinder?) {
            service = (binder as TrackerService.LocalBinder).service
            bound = true
            service?.listener = ::renderStatus
            renderStatus()
        }

        override fun onServiceDisconnected(name: ComponentName?) {
            bound = false
            service = null
        }
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        val pad = (16 * resources.displayMetrics.density).toInt()
        val layout = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            setPadding(pad, pad, pad, pad)
        }

        vehicleIdInput = EditText(this).apply { hint = "Vehicle ID (e.g. V-001)"; setText(prefs().getString(KEY_VEHICLE_ID, "")) }
        secretInput = EditText(this).apply {
            hint = "GPS_AUTH_SECRET (from backend .env)"
            setText(prefs().getString(KEY_SECRET, ""))
        }
        statusText = TextView(this).apply { text = "STOPPED" }
        toggleButton = Button(this).apply { text = "START TRACKING" }

        toggleButton.setOnClickListener {
            val vehicleId = vehicleIdInput.text.toString().trim().uppercase()
            val secret = secretInput.text.toString().trim()
            if (vehicleId.isEmpty()) {
                Toast.makeText(this, "Enter a vehicle ID", Toast.LENGTH_SHORT).show()
                return@setOnClickListener
            }
            prefs().edit().putString(KEY_VEHICLE_ID, vehicleId).putString(KEY_SECRET, secret).apply()

            if (service?.isRunning == true) {
                stopTracker()
            } else {
                if (!hasLocationPermission()) {
                    ActivityCompat.requestPermissions(
                        this,
                        arrayOf(
                            Manifest.permission.ACCESS_FINE_LOCATION,
                            Manifest.permission.ACCESS_COARSE_LOCATION
                        ),
                        1001
                    )
                } else {
                    startTracker()
                }
            }
        }

        layout.addView(vehicleIdInput)
        layout.addView(secretInput)
        layout.addView(toggleButton)
        layout.addView(statusText)
        setContentView(layout)
    }

    override fun onStart() {
        super.onStart()
        bindIntent()
    }

    override fun onStop() {
        super.onStop()
        if (bound) {
            unbindService(connection)
            bound = false
        }
    }

    private fun bindIntent() {
        val intent = Intent(this, TrackerService::class.java)
        bindService(intent, connection, Context.BIND_AUTO_CREATE)
    }

    private fun hasLocationPermission(): Boolean =
        ContextCompat.checkSelfPermission(this, Manifest.permission.ACCESS_FINE_LOCATION) ==
            PackageManager.PERMISSION_GRANTED ||
            ContextCompat.checkSelfPermission(this, Manifest.permission.ACCESS_COARSE_LOCATION) ==
            PackageManager.PERMISSION_GRANTED

    override fun onRequestPermissionsResult(
        requestCode: Int, permissions: Array<out String>, grantResults: IntArray
    ) {
        super.onRequestPermissionsResult(requestCode, permissions, grantResults)
        if (requestCode == 1001 && grantResults.isNotEmpty() &&
            grantResults[0] == PackageManager.PERMISSION_GRANTED
        ) {
            startTracker()
        } else {
            Toast.makeText(this, "Location permission is required for tracking", Toast.LENGTH_LONG).show()
        }
    }

    private fun startTracker() {
        if (Build.VERSION.SDK_INT >= 33 &&
            ContextCompat.checkSelfPermission(this, "android.permission.POST_NOTIFICATIONS") !=
            PackageManager.PERMISSION_GRANTED
        ) {
            ActivityCompat.requestPermissions(this, arrayOf("android.permission.POST_NOTIFICATIONS"), 1002)
        }
        val intent = Intent(this, TrackerService::class.java)
        ContextCompat.startForegroundService(this, intent)
        bindIntent()
        toggleButton.text = "STOP TRACKING"
    }

    private fun stopTracker() {
        service?.stopForegroundService()
        toggleButton.text = "START TRACKING"
        statusText.text = "STOPPED"
    }

    private fun renderStatus() {
        val s = service ?: return
        runOnUiThread {
            statusText.text = buildString {
                append("STATE: ${s.stateName}\n")
                append("QUEUED FIXES: ${s.queueSize}\n")
                append("LAST FIX: ${s.lastFixSummary ?: "—"}\n")
                append("SERVER ACK: ${s.lastAckSummary ?: "—"}")
            }
        }
    }

    private fun prefs() = getSharedPreferences("qflow_tracker", Context.MODE_PRIVATE)

    companion object { const val KEY_VEHICLE_ID = "vehicle_id"; const val KEY_SECRET = "secret" }
}
