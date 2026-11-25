package dev.simdesk.gateway

import android.content.Context
import android.telephony.SubscriptionManager

object LineNumber {
    fun read(context: Context): String {
        return try {
            val subscriptionId = SubscriptionManager.getDefaultSmsSubscriptionId()
            if (subscriptionId == SubscriptionManager.INVALID_SUBSCRIPTION_ID) return ""
            val info = context.getSystemService(SubscriptionManager::class.java)
                ?.getActiveSubscriptionInfo(subscriptionId)
            info?.number?.trim().orEmpty()
        } catch (_: SecurityException) {
            ""
        }
    }
}
