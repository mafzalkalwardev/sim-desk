# Run

## Requirements

- Node.js 20 or newer and npm.
- For the handset: Android platform-tools (`adb`), JDK 17, Android SDK platform 34, and build-tools.
- An Android phone, API 26 or newer, on the same Wi-Fi, with a SIM. Wireless debugging is how this desk installs the gateway. It is not the SMS transport.

## Setup

1. `npm install`
2. Copy `.env.example` to `.env`.
3. Set `OPERATOR_KEY` to a long random string. The server will not start operator routes without it.
4. Leave `DATABASE_PATH` empty to use `data/sim-desk.sqlite`, or set a path.
5. Set `LAN_BASE_URL` to this PC's `http://<lan-ip>:3000` so the phone can poll after `adb reverse` drops.
6. Set `ADB_SERIAL` after `adb devices` shows the phone, if you want an immediate wake on send.

## Develop

`npm run dev`

Open `http://127.0.0.1:3000`. Create a pairing code, install `android/sim-desk.apk` on the phone, and register it. The same file is the download on the GitHub release.

Android, from `android/` after `ANDROID_HOME` points at the SDK:

```
./gradlew assembleDebug
adb reverse tcp:3000 tcp:3000
adb install -r app/build/outputs/apk/debug/app-debug.apk
adb shell pm grant dev.simdesk.gateway android.permission.SEND_SMS
adb shell pm grant dev.simdesk.gateway android.permission.RECEIVE_SMS
adb shell pm grant dev.simdesk.gateway android.permission.READ_SMS
adb shell pm grant dev.simdesk.gateway android.permission.READ_PHONE_STATE
adb shell pm grant dev.simdesk.gateway android.permission.READ_PHONE_NUMBERS
```

On PowerShell, run `gradlew.bat` instead of `./gradlew`.

If `pm grant` refuses SMS on Android 15 or newer: open the app's App info, tap the menu, choose Allow restricted settings, then grant SMS. Do not set sim-desk as the default SMS app.

Wireless debugging is only for installing the app. Developer options, Wireless debugging. If `adb mdns services` does not already show an authorized device, read the pairing code and the pairing IP:port on the phone, then `adb pair <ip:port> <code>` and `adb connect <connect-ip:port>`. The Infinix (`adb-07565251B3004195-3bhxID`) is already authorized. Connect the IP and port on the Wireless debugging screen. Do not pair again unless the phone says the computer is forgotten.

## Pair a handset

The Infinix named Infinix is already registered and polling the live desk. Use these steps for another phone, or to register this one again.

1. Open the desk. On this PC, `http://127.0.0.1:3000` unlocks by itself. On the public URL, paste `OPERATOR_KEY` from `.env` and press Unlock.
2. Press **New pairing code**. The code is six digits and expires in ten minutes.
3. On the phone, open SIM Desk. Set Desk URL to `https://simdesk.induswebagency.com`.
4. Type the code, keep or change the handset name, and press Register.
5. The app stores a device token and starts polling. The presence dot shows that handset when a heartbeat arrives. Online means a heartbeat in the last 90 seconds.

The inbox uses the newest registered handset. A send with no chosen device uses the handset whose heartbeat is newest. Grant SMS on the phone before expecting a send. A reply shows in the conversation, labeled Received. New replies can be opened from Unread. Do not make SIM Desk the default SMS app.

## Test

`npm test`

## Build

`npm run build`

The debug APK build is the Gradle command in Setup.

## Deploy

The queue runs on the VPS at `/opt/sim-desk`, served by systemd `sim-desk` on `127.0.0.1:3030`, with nginx and HTTPS in front. The database is `/var/lib/sim-desk/sim-desk.sqlite`. `OPERATOR_KEY` is in `/etc/sim-desk.env` on that server. Do not publish the Node port.

The public page does not include `OPERATOR_KEY`. On this PC, `http://127.0.0.1:3000` unlocks by itself only while a local desk is running. On the public host, paste the key from `.env`. `GET /api/session` answers only for a localhost or private-LAN `Host`.

The live desk is `https://simdesk.induswebagency.com`. Set the phone's Desk URL to that host. The certificate renews with certbot. This PC can sleep. The phone still has to stay on to send.

## Environment

See `.env.example`.
