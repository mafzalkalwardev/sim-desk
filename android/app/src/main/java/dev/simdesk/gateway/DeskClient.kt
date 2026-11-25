package dev.simdesk.gateway

import org.json.JSONArray
import org.json.JSONObject
import java.io.BufferedReader
import java.io.OutputStreamWriter
import java.net.HttpURLConnection
import java.net.URL

class DeskClient(
    private val baseUrl: String,
    private val deviceId: String,
    private val token: String,
) {
    data class Pending(val id: String, val address: String, val body: String)

    fun heartbeat(battery: Int, lineNumber: String) {
        val body = JSONObject().put("battery", battery)
        if (lineNumber.isNotBlank()) body.put("lineNumber", lineNumber)
        post("/api/devices/$deviceId/heartbeat", body, auth = true)
    }

    fun pending(): List<Pending> {
        val json = get("/api/devices/$deviceId/pending")
        val rows = json.optJSONArray("messages") ?: JSONArray()
        val out = mutableListOf<Pending>()
        for (i in 0 until rows.length()) {
            val row = rows.getJSONObject(i)
            out.add(Pending(row.getString("id"), row.getString("address"), row.getString("body")))
        }
        return out
    }

    fun report(id: String, status: String, error: String?) {
        val body = JSONObject().put("id", id).put("status", status)
        if (error != null) body.put("error", error)
        post("/api/devices/$deviceId/report", body, auth = true)
    }

    fun inbox(rows: JSONArray) {
        post("/api/devices/$deviceId/inbox", JSONObject().put("messages", rows), auth = true)
    }

    private fun get(path: String): JSONObject {
        val connection = open(path)
        connection.requestMethod = "GET"
        connection.setRequestProperty("Authorization", "Bearer $token")
        return read(connection)
    }

    private fun post(path: String, body: JSONObject, auth: Boolean) {
        val connection = open(path)
        connection.requestMethod = "POST"
        connection.doOutput = true
        connection.setRequestProperty("Content-Type", "application/json")
        if (auth) connection.setRequestProperty("Authorization", "Bearer $token")
        OutputStreamWriter(connection.outputStream).use { it.write(body.toString()) }
        read(connection)
    }

    private fun open(path: String): HttpURLConnection {
        val connection = URL(baseUrl.trimEnd('/') + path).openConnection() as HttpURLConnection
        connection.connectTimeout = 8000
        connection.readTimeout = 8000
        return connection
    }

    private fun read(connection: HttpURLConnection): JSONObject {
        val stream = if (connection.responseCode in 200..299) connection.inputStream else connection.errorStream
        val text = stream?.bufferedReader()?.use(BufferedReader::readText) ?: ""
        if (connection.responseCode !in 200..299) {
            throw IllegalStateException("Desk ${connection.responseCode} $text")
        }
        if (text.isBlank()) return JSONObject()
        return JSONObject(text)
    }

    companion object {
        fun from(context: android.content.Context): DeskClient? {
            if (!Store.ready(context)) return null
            return DeskClient(Store.baseUrl(context), Store.deviceId(context), Store.token(context))
        }

        fun register(baseUrl: String, code: String, name: String): JSONObject {
            val connection = URL(baseUrl.trimEnd('/') + "/api/devices/register").openConnection() as HttpURLConnection
            connection.requestMethod = "POST"
            connection.doOutput = true
            connection.connectTimeout = 8000
            connection.readTimeout = 8000
            connection.setRequestProperty("Content-Type", "application/json")
            val body = JSONObject().put("code", code).put("name", name)
            OutputStreamWriter(connection.outputStream).use { it.write(body.toString()) }
            val stream = if (connection.responseCode in 200..299) connection.inputStream else connection.errorStream
            val text = stream?.bufferedReader()?.use(BufferedReader::readText) ?: ""
            if (connection.responseCode !in 200..299) throw IllegalStateException(text.ifBlank { "Register failed" })
            return JSONObject(text)
        }
    }
}
