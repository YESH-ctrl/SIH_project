package io.qflow.tracker

import org.json.JSONArray
import org.json.JSONObject
import java.io.BufferedReader
import java.io.InputStreamReader
import java.net.HttpURLConnection
import java.net.URL
import java.nio.charset.StandardCharsets
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale
import java.util.TimeZone

/** JSON payload + HTTP client for the Q-FLOW telemetry API. */
object TelemetryModels {
    data class PositionPayload(
        val vehicle_id: String,
        val timestamp: String,
        val latitude: Double,
        val longitude: Double,
        val speed_kmh: Double?,
        val heading_deg: Double?,
        val accuracy_m: Double?,
        val altitude_m: Double?,
        val source: String
    )

    data class TelemetryAck(
        val accepted: Boolean,
        val vehicle_id: String,
        val matched_edge_id: String?,
        val road_name: String?,
        val match_confidence: Double?,
        val tracking_status: String,
        val mode: String
    )

    fun isoNow(): String {
        val fmt = SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss'Z'", Locale.US)
        fmt.timeZone = TimeZone.getTimeZone("UTC")
        return fmt.format(Date())
    }

    fun payloadToJson(p: PositionPayload): String = JSONObject().apply {
        put("vehicle_id", p.vehicle_id)
        put("timestamp", p.timestamp)
        put("latitude", p.latitude)
        put("longitude", p.longitude)
        p.speed_kmh?.let { put("speed_kmh", it) } ?: put("speed_kmh", JSONObject.NULL)
        p.heading_deg?.let { put("heading_deg", it) } ?: put("heading_deg", JSONObject.NULL)
        p.accuracy_m?.let { put("accuracy_m", it) } ?: put("accuracy_m", JSONObject.NULL)
        p.altitude_m?.let { put("altitude_m", it) } ?: put("altitude_m", JSONObject.NULL)
        put("source", p.source)
    }.toString()

    fun ackFromJson(json: String): TelemetryAck {
        val o = JSONObject(json)
        return TelemetryAck(
            accepted = o.optBoolean("accepted", true),
            vehicle_id = o.optString("vehicle_id"),
            matched_edge_id = o.optString("matched_edge_id", null.takeIf { false } ?: ""),
            road_name = o.optString("road_name", ""),
            match_confidence = if (o.has("match_confidence") && !o.isNull("match_confidence")) o.getDouble("match_confidence") else null,
            tracking_status = o.optString("tracking_status", "LIVE"),
            mode = o.optString("mode", "LIVE")
        )
    }
}

class TelemetryApiClient(
    // Emulator → host machine: http://10.0.2.2:8000 ; production: https://your-domain
    private val baseUrl: String = "http://10.0.2.2:8000"
) {
    /** Uploads a batch (size 1 works as a single POST). Returns per-item acks when available. */
    fun upload(secret: String, batch: List<TelemetryModels.PositionPayload>): List<TelemetryModels.TelemetryAck> {
        val endpoint = if (batch.size == 1) "$baseUrl/api/v1/telemetry/position" else "$baseUrl/api/v1/telemetry/position/batch"
        val body = if (batch.size == 1) {
            TelemetryModels.payloadToJson(batch[0])
        } else {
            JSONArray().apply { batch.forEach { put(JSONObject(TelemetryModels.payloadToJson(it))) } }
                .let { JSONObject().put("positions", it) }.toString()
        }

        val conn = (URL(endpoint).openConnection() as HttpURLConnection).apply {
            requestMethod = "POST"
            connectTimeout = 8000
            readTimeout = 8000
            doOutput = true
            setRequestProperty("Content-Type", "application/json")
            if (secret.isNotEmpty()) setRequestProperty("Authorization", "Bearer $secret")
        }
        try {
            conn.outputStream.use { it.write(body.toByteArray(StandardCharsets.UTF_8)) }
            val code = conn.responseCode
            val stream = if (code in 200..299) conn.inputStream else conn.errorStream
            val text = BufferedReader(InputStreamReader(stream ?: "".byteInputStream(), StandardCharsets.UTF_8))
                .use { it.readText() }
            if (code !in 200..299) throw RuntimeException("HTTP $code: ${text.take(120)}")

            val parsed = JSONObject(text)
            return if (parsed.has("results")) {
                val arr = parsed.getJSONArray("results")
                (0 until arr.length()).map { TelemetryModels.ackFromJson(arr.getJSONObject(it).toString()) }
            } else {
                listOf(TelemetryModels.ackFromJson(text))
            }
        } finally {
            conn.disconnect()
        }
    }
}
