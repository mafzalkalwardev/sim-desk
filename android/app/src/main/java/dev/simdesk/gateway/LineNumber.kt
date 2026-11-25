package dev.simdesk.gateway

import android.content.Context
import android.telephony.SubscriptionManager

object LineNumber {
    data class Identity(val number: String, val carrier: String)

    fun read(context: Context): Identity {
        return try {
            val subscriptionId = SubscriptionManager.getDefaultSmsSubscriptionId()
            if (subscriptionId == SubscriptionManager.INVALID_SUBSCRIPTION_ID) return Identity("", "")
            val info = context.getSystemService(SubscriptionManager::class.java)
                ?.getActiveSubscriptionInfo(subscriptionId) ?: return Identity("", "")
            val number = info.number?.filter { it.isDigit() || it == '+' }.orEmpty()
            val carrier = info.displayName?.toString()?.trim().orEmpty()
                .ifEmpty { info.carrierName?.toString()?.trim().orEmpty() }
            Identity(number, carrier)
        } catch (_: SecurityException) {
            Identity("", "")
        }
    }
}
