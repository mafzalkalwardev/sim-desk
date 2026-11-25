# Memory

## Decisions

- 2026-11-24 — Local queue plus an on-phone sender — TextBee pushes with Firebase; this desk polls so v0.1 needs no Google project file.
- 2026-11-24 — Two SQLite tables, `devices` and `messages` — pairing lives on a `devices` row with status `pairing` until the phone registers.
- 2026-11-24 — Do not become the default SMS app — `SmsManager` sends, and `READ_SMS` mirrors rows the platform already stored.
- 2026-11-24 — The queue file and the SIM stay on this PC. A Cloudflare quick tunnel can publish the desk; the operator key stays out of the public page.
- 2026-11-25 — The completed gateway runs on the existing VPS at https://simdesk.induswebagency.com. The phone polls that host. This PC can sleep. The SIM stays in the phone.

## Stack

- Next.js App Router, React, Drizzle, better-sqlite3, Vitest, GSAP, Framer Motion — launch-project default for a web product that stores a queue. npm.
- Kotlin Android app, minSdk 26, foreground service type `dataSync`, package `dev.simdesk.gateway` — the phone has to call `SmsManager`; the web server cannot.

## Paid later

- The live desk now uses the existing VPS. Do not publish the Node port. This PC does not have to stay awake.
- Firebase Cloud Messaging — free, but it needs a Google project file. v0.1 polls, and wireless adb can wake the app while debugging is connected.
- A custom domain — the canonical URL is the GitHub repository.
