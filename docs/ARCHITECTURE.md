# Architecture

sim-desk is two processes. The Next.js server owns the queue. On the live desk that server runs on the VPS. The Android app on the phone owns the SIM.

## Runtime

- `src/app/api/**` — route handlers.
- `src/db/schema.ts` — Drizzle tables `devices` and `messages`.
- `src/db/client.ts` — the `better-sqlite3` connection.
- `src/lib/auth.ts` — `OPERATOR_KEY` check and device-token hashes.
- `src/lib/phone.ts` — E.164 check, recipient cap, rate cap.
- `src/lib/messages.ts` — queue, pending pull, status report, inbox insert.
- `src/app/page.tsx` — the inbox.
- `android/` — package `dev.simdesk.gateway`. `SmsSender` calls `SmsManager`. `GatewayService` polls and uploads. `InboxReader` reads the telephony provider.

## Request path

1. The desk creates a `devices` row with status `pairing`, a code hash, and an expiry.
2. The phone `POST /api/devices/register` with that code. The row becomes `active` and the response carries a device token. The database keeps the token hash.
3. The operator `POST /api/messages` with `OPERATOR_KEY`, a recipient list, and a body. Each recipient becomes one `messages` row in `queued`.
4. The phone `GET /api/devices/:id/pending` with its token, sends each row, then `POST /api/devices/:id/report`.
5. The phone `POST /api/devices/:id/inbox` with new telephony rows. The inbox reads `GET /api/messages`. A reply is stored on the canonical number, so it appears in the conversation that was sent.
6. Heartbeats land on `POST /api/devices/:id/heartbeat`. Online means a heartbeat newer than 90 seconds.

After registration, the phone polls `PUBLIC_URL`. The live host is the VPS.

## Data store

SQLite file at `DATABASE_PATH`, default `data/sim-desk.sqlite`. On the VPS the file is `/var/lib/sim-desk/sim-desk.sqlite`. `devices` holds name, status, pairing hash, token hash, last heartbeat, battery, adb serial, the saved sender number, and the carrier name reported by the phone. `messages` holds device id, direction, address, body, status, provider id, and timestamps.

## Tests

Vitest, in `src/lib/*.test.ts` and `src/app/api/**/*.test.ts`. They hit the route handlers and a temporary SQLite file. The Android module is exercised on the handset, not in Vitest.
