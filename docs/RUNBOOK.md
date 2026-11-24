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

This PC paired with the Infinix (`adb-07565251B3004195-3bhxID`) on 2026-11-24. The connect port `192.168.1.6:43113` then closed, so the phone is paired but not attached. Leave the Wireless debugging screen open and run `adb connect` against the IP and port printed there. Do not pair again unless the phone says the computer is forgotten.

## Test

`npm test`

## Build

`npm run build`

The debug APK build is the Gradle command in Setup.

## Deploy

The queue file stays on this PC. `npm run build && npm start` listens on `0.0.0.0:3000`. A Cloudflare quick tunnel forwards a public HTTPS host to that port so the desk can be opened away from the LAN. Do not publish port 3000 on the router.

The public page does not include `OPERATOR_KEY`. On this PC, `http://127.0.0.1:3000` unlocks by itself. On the public host, paste the key from `.env`. `GET /api/session` answers only for a localhost or private-LAN `Host`.

The current tunnel is `https://9e11cd6d0707bc.app.lhr.life`. A free tunnel host can change if the SSH session drops. The latest host is also on issue #5.

Set `PUBLIC_URL` to the tunnel host after it starts, and set the phone's base URL to that same HTTPS host when `adb reverse` is down. The phone still polls this PC's queue. No custom domain.

## Environment

See `.env.example`.
