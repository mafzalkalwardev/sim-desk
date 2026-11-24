package dev.simdesk.gateway

import android.content.Context

object Store {
    private const val PREFS = "simdesk"

    fun prefs(context: Context) = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE)

    fun baseUrl(context: Context) = prefs(context).getString("baseUrl", "http://127.0.0.1:3000") ?: "http://127.0.0.1:3000"

    fun deviceId(context: Context) = prefs(context).getString("deviceId", "") ?: ""

    fun token(context: Context) = prefs(context).getString("token", "") ?: ""

    fun ready(context: Context) = deviceId(context).isNotEmpty() && token(context).isNotEmpty()

    fun lastProviderId(context: Context) = prefs(context).getLong("lastProviderId", 0L)

    fun setLastProviderId(context: Context, id: Long) {
        prefs(context).edit().putLong("lastProviderId", id).apply()
    }
}
