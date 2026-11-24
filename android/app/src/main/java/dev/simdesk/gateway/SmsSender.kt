package dev.simdesk.gateway

import android.app.Activity
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.os.Build
import android.telephony.SmsManager

object SmsSender {
    fun send(context: Context, id: String, address: String, body: String) {
        val sms = manager(context)
        val parts = sms.divideMessage(body)
        if (parts.size <= 1) {
            sms.sendTextMessage(address, null, body, statusIntent(context, id, "dev.simdesk.gateway.SMS_SENT"), statusIntent(context, id, "dev.simdesk.gateway.SMS_DELIVERED"))
            return
        }
        val sent = ArrayList<PendingIntent>()
        val delivered = ArrayList<PendingIntent>()
        parts.forEachIndexed { index, _ ->
            sent.add(statusIntent(context, "$id:$index", "dev.simdesk.gateway.SMS_SENT", id))
            delivered.add(statusIntent(context, "$id:d:$index", "dev.simdesk.gateway.SMS_DELIVERED", id))
        }
        sms.sendMultipartTextMessage(address, null, parts, sent, delivered)
    }

    private fun statusIntent(context: Context, requestKey: String, action: String, messageId: String = requestKey): PendingIntent {
        val intent = Intent(context, SmsStatusReceiver::class.java).apply {
            this.action = action
            putExtra("id", messageId)
        }
        val flags = PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        return PendingIntent.getBroadcast(context, requestKey.hashCode(), intent, flags)
    }

    private fun manager(context: Context): SmsManager {
        return if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            context.getSystemService(SmsManager::class.java)
        } else {
            @Suppress("DEPRECATION")
            SmsManager.getDefault()
        }
    }

    fun isOk(resultCode: Int) = resultCode == Activity.RESULT_OK
}
