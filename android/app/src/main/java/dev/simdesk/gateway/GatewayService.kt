package dev.simdesk.gateway

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.Service
import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import android.os.BatteryManager
import android.os.IBinder
import java.util.concurrent.Executors
import java.util.concurrent.atomic.AtomicBoolean

class GatewayService : Service() {
    private val running = AtomicBoolean(false)
    private val executor = Executors.newSingleThreadExecutor()

    override fun onBind(intent: Intent?): IBinder? = null

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        startForeground(NOTICE_ID, notification())
        if (running.compareAndSet(false, true)) {
            executor.execute { loop() }
        }
        return START_STICKY
    }

    override fun onDestroy() {
        running.set(false)
        executor.shutdownNow()
        super.onDestroy()
    }

    private fun loop() {
        while (running.get()) {
            try {
                cycle()
            } catch (_: Exception) {
            }
            try {
                Thread.sleep(3000)
            } catch (_: InterruptedException) {
                return
            }
        }
    }

    private fun cycle() {
        val client = DeskClient.from(this) ?: return
        val battery = batteryPercent()
        client.heartbeat(battery)
        val rows = InboxReader.readNew(this)
        if (rows.length() > 0) client.inbox(rows)
        for (message in client.pending()) {
            SmsSender.send(this, message.id, message.address, message.body)
        }
    }

    private fun batteryPercent(): Int {
        val filter = registerReceiver(null, IntentFilter(Intent.ACTION_BATTERY_CHANGED)) ?: return 0
        val level = filter.getIntExtra(BatteryManager.EXTRA_LEVEL, 0)
        val scale = filter.getIntExtra(BatteryManager.EXTRA_SCALE, 100).coerceAtLeast(1)
        return (level * 100) / scale
    }

    private fun notification(): Notification {
        val manager = getSystemService(NotificationManager::class.java)
        val channel = NotificationChannel(CHANNEL, getString(R.string.channel), NotificationManager.IMPORTANCE_LOW)
        manager.createNotificationChannel(channel)
        return Notification.Builder(this, CHANNEL)
            .setSmallIcon(android.R.drawable.stat_notify_chat)
            .setContentTitle(getString(R.string.app_name))
            .setContentText(getString(R.string.notification))
            .setOngoing(true)
            .build()
    }

    companion object {
        private const val NOTICE_ID = 7
        private const val CHANNEL = "gateway"

        fun start(context: Context) {
            context.startForegroundService(Intent(context, GatewayService::class.java))
        }
    }
}
