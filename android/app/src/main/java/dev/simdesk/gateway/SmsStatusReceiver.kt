package dev.simdesk.gateway

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent

class SmsStatusReceiver : BroadcastReceiver() {
    override fun onReceive(context: Context, intent: Intent) {
        val id = intent.getStringExtra("id") ?: return
        val ok = SmsSender.isOk(resultCode)
        val status = when (intent.action) {
            "dev.simdesk.gateway.SMS_DELIVERED" -> if (ok) "delivered" else return
            else -> if (ok) "sent" else "failed"
        }
        val error = if (status == "failed") "carrier result $resultCode" else null
        Thread {
            try {
                DeskClient.from(context)?.report(id, status, error)
            } catch (_: Exception) {
            }
        }.start()
    }
}
