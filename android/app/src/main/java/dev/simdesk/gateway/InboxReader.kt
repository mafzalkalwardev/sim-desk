package dev.simdesk.gateway

import android.content.Context
import android.provider.Telephony
import org.json.JSONArray
import org.json.JSONObject

object InboxReader {
    fun readNew(context: Context): JSONArray {
        val rows = JSONArray()
        val last = Store.lastProviderId(context)
        val cursor = context.contentResolver.query(
            Telephony.Sms.CONTENT_URI,
            arrayOf(Telephony.Sms._ID, Telephony.Sms.ADDRESS, Telephony.Sms.BODY, Telephony.Sms.TYPE),
            "${Telephony.Sms._ID} > ?",
            arrayOf(last.toString()),
            "${Telephony.Sms._ID} ASC",
        ) ?: return rows
        var max = last
        cursor.use {
            val idCol = it.getColumnIndexOrThrow(Telephony.Sms._ID)
            val addressCol = it.getColumnIndexOrThrow(Telephony.Sms.ADDRESS)
            val bodyCol = it.getColumnIndexOrThrow(Telephony.Sms.BODY)
            val typeCol = it.getColumnIndexOrThrow(Telephony.Sms.TYPE)
            while (it.moveToNext()) {
                val id = it.getLong(idCol)
                if (id > max) max = id
                val type = it.getInt(typeCol)
                val direction = when (type) {
                    Telephony.Sms.MESSAGE_TYPE_INBOX -> "in"
                    Telephony.Sms.MESSAGE_TYPE_SENT -> "out"
                    else -> null
                } ?: continue
                rows.put(
                    JSONObject()
                        .put("providerId", id.toString())
                        .put("address", it.getString(addressCol) ?: "")
                        .put("body", it.getString(bodyCol) ?: "")
                        .put("direction", direction),
                )
            }
        }
        if (max > last) Store.setLastProviderId(context, max)
        return rows
    }
}
