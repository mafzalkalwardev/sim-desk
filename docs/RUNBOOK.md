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

Open `http://127.0.0.1:3000`. Create a pairing code, install `android/` (see below), and register the phone.

Android, from `android/` after `ANDROID_HOME` points at the SDK:

```
./gradlew assembleDebug
adb reverse tcp:3000 tcp:3000
adb install -r app/build/outputs/apk/debug/app-debug.apk
adb shell pm grant dev.simdesk.gateway android.permission.SEND_SMS
adb shell pm grant dev.simdesk.gateway android.permission.RECEIVE_SMS
adb shell pm grant dev.simdesk.gateway android.permission.READ_SMS
```

On PowerShell, run `gradlew.bat` instead of `./gradlew`.

If `pm grant` refuses SMS on Android 15 or newer: open the app's App info, tap the menu, choose Allow restricted settings, then grant SMS. Do not set sim-desk as the default SMS app.

Pairing: Developer options, Wireless debugging. If `adb mdns services` does not already show an authorized device, read the pairing code and the pairing IP:port on the phone, then `adb pair <ip:port> <code>` and `adb connect <connect-ip:port>`.

## Test

`npm test`

## Build

`npm run build`

The debug APK build is the Gradle command in Setup.

## Deploy

No public URL in v0.1. The queue is a SQLite file on this PC, and the send path must stay on the LAN so a stranger cannot spend the SIM.

Unpaid next step, only if you later need the phone to reach the desk from another network: run this same `npm run dev` (or `npm run build && npm start`) on a machine the phone can already route to, and set `LAN_BASE_URL` to that machine. Do not publish port 3000 on the open internet. A VPS or a tunnel is optional and is not part of this release. No custom domain.

## Environment

See `.env.example`.
