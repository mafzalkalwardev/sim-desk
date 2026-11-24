package dev.simdesk.gateway

import android.os.Bundle
import android.widget.Button
import android.widget.EditText
import android.widget.TextView
import android.app.Activity

class MainActivity : Activity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_main)
        val status = findViewById<TextView>(R.id.status)
        val baseUrl = findViewById<EditText>(R.id.baseUrl)
        val code = findViewById<EditText>(R.id.pairingCode)
        val name = findViewById<EditText>(R.id.deviceName)
        baseUrl.setText(Store.baseUrl(this))
        refresh(status)
        findViewById<Button>(R.id.register).setOnClickListener {
            val url = baseUrl.text.toString().trim()
            val pairing = code.text.toString().trim()
            val label = name.text.toString().trim()
            status.text = "Registering"
            Thread {
                try {
                    val result = DeskClient.register(url, pairing, label)
                    Store.prefs(this).edit()
                        .putString("baseUrl", url)
                        .putString("deviceId", result.getString("id"))
                        .putString("token", result.getString("token"))
                        .apply()
                    runOnUiThread {
                        refresh(status)
                        GatewayService.start(this)
                    }
                } catch (error: Exception) {
                    runOnUiThread { status.text = error.message ?: "Register failed" }
                }
            }.start()
        }
    }

    override fun onResume() {
        super.onResume()
        if (Store.ready(this)) GatewayService.start(this)
        refresh(findViewById(R.id.status))
    }

    private fun refresh(status: TextView) {
        status.text = if (Store.ready(this)) "Registered. The gateway is polling the desk." else "Enter the pairing code from the desk."
    }
}
