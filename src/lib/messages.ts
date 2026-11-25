import { execFile } from "child_process";
import { and, desc, eq, gt } from "drizzle-orm";
import { randomInt, randomUUID } from "crypto";
import { devices, messages } from "../db/schema";
import { getDb } from "../db/client";
import { fail, hashSecret, newToken, type Result } from "./auth";
import { checkRecipients } from "./phone";

const PAIRING_MS = 10 * 60 * 1000;
const ONLINE_MS = 90 * 1000;
const RATE_MS = 60 * 1000;
const RATE_CAP = 10;
const MATCH_MS = 10 * 60 * 1000;

const rank: Record<string, number> = {
  queued: 0,
  failed: 1,
  sent: 2,
  delivered: 3,
  received: 4,
};

export type DeviceView = {
  id: string;
  name: string;
  status: string;
  lastHeartbeat: number | null;
  battery: number | null;
  lineNumber: string | null;
  online: boolean;
};

export type MessageView = {
  id: string;
  deviceId: string;
  direction: string;
  address: string;
  body: string;
  status: string;
  error: string | null;
  createdAt: number;
  updatedAt: number;
};

function toMessage(row: typeof messages.$inferSelect): MessageView {
  return {
    id: row.id,
    deviceId: row.deviceId,
    direction: row.direction,
    address: row.address,
    body: row.body,
    status: row.status,
    error: row.error,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

function deviceByToken(id: string, token: string) {
  const db = getDb();
  const row = db.select().from(devices).where(eq(devices.id, id)).get();
  if (!row || row.status !== "active" || !row.tokenHash) return null;
  if (row.tokenHash !== hashSecret(token)) return null;
  return row;
}

export function bearer(header: string | null) {
  if (!header?.toLowerCase().startsWith("bearer ")) return "";
  return header.slice(7).trim();
}

export function createPairing() {
  const db = getDb();
  const code = String(randomInt(0, 1_000_000)).padStart(6, "0");
  const id = randomUUID();
  const now = Date.now();
  db.insert(devices)
    .values({
      id,
      name: "",
      status: "pairing",
      pairingCodeHash: hashSecret(code),
      pairingExpiresAt: now + PAIRING_MS,
      createdAt: now,
    })
    .run();
  return { id, code, expiresAt: now + PAIRING_MS };
}

export function registerDevice(code: string, name: string): Result<{ id: string; token: string; name: string }> {
  const trimmed = code.trim();
  if (!/^[0-9]{6}$/.test(trimmed)) return fail(400, "Pairing code must be 6 digits");
  const db = getDb();
  const now = Date.now();
  const hash = hashSecret(trimmed);
  const row = db
    .select()
    .from(devices)
    .where(and(eq(devices.status, "pairing"), eq(devices.pairingCodeHash, hash)))
    .get();
  if (!row || !row.pairingExpiresAt || row.pairingExpiresAt < now) {
    return fail(404, "Pairing code not found");
  }
  const token = newToken();
  const label = name.trim() || "Handset";
  db.update(devices)
    .set({
      name: label,
      status: "active",
      tokenHash: hashSecret(token),
      pairingCodeHash: null,
      pairingExpiresAt: null,
      lastHeartbeat: now,
    })
    .where(eq(devices.id, row.id))
    .run();
  return { ok: true, data: { id: row.id, token, name: label } };
}

export function heartbeat(id: string, token: string, battery: number | null, lineNumber: string | null = null): Result<DeviceView> {
  const row = deviceByToken(id, token);
  if (!row) return fail(401, "Device token required");
  const now = Date.now();
  const db = getDb();
  const line = lineNumber?.trim().slice(0, 20) ?? "";
  db.update(devices)
    .set({
      lastHeartbeat: now,
      battery: battery === null ? row.battery : Math.max(0, Math.min(100, Math.round(battery))),
      ...(line ? { lineNumber: line } : {}),
    })
    .where(eq(devices.id, id))
    .run();
  const next = db.select().from(devices).where(eq(devices.id, id)).get();
  if (!next) return fail(404, "Device not found");
  return { ok: true, data: viewDevice(next) };
}

function viewDevice(row: typeof devices.$inferSelect): DeviceView {
  const fresh = row.lastHeartbeat !== null && Date.now() - row.lastHeartbeat < ONLINE_MS;
  return {
    id: row.id,
    name: row.name,
    status: row.status,
    lastHeartbeat: row.lastHeartbeat,
    battery: row.battery,
    lineNumber: row.lineNumber,
    online: row.status === "active" && fresh,
  };
}

export function listDevices(): DeviceView[] {
  const db = getDb();
  return db
    .select()
    .from(devices)
    .orderBy(desc(devices.createdAt))
    .all()
    .filter((row) => row.status !== "pairing")
    .map(viewDevice);
}

function pickDevice(deviceId?: string) {
  const db = getDb();
  if (deviceId) {
    const row = db.select().from(devices).where(eq(devices.id, deviceId)).get();
    if (!row || row.status !== "active") return null;
    return row;
  }
  const rows = db
    .select()
    .from(devices)
    .where(eq(devices.status, "active"))
    .orderBy(desc(devices.lastHeartbeat))
    .all();
  return rows[0] ?? null;
}

export function queueMessages(input: {
  to: string[];
  body: string;
  deviceId?: string;
}): Result<MessageView[]> {
  const body = input.body?.trim() ?? "";
  if (!body) return fail(400, "Message body is required");
  if (body.length > 1000) return fail(400, "Message body is too long");
  const recipients = checkRecipients(input.to);
  if (!recipients.ok) return recipients;
  const device = pickDevice(input.deviceId);
  if (!device) return fail(409, "No active handset");
  const db = getDb();
  const since = Date.now() - RATE_MS;
  const recent = db
    .select()
    .from(messages)
    .where(and(eq(messages.direction, "out"), gt(messages.createdAt, since)))
    .all();
  if (recent.length + recipients.data.length > RATE_CAP) {
    return fail(429, "Rate cap is 10 sends per minute");
  }
  const now = Date.now();
  const created: MessageView[] = [];
  for (const address of recipients.data) {
    const id = randomUUID();
    const row = {
      id,
      deviceId: device.id,
      direction: "out",
      address,
      body,
      status: "queued",
      providerId: null,
      error: null,
      createdAt: now,
      updatedAt: now,
    };
    db.insert(messages).values(row).run();
    created.push(toMessage(row));
  }
  wakePhone();
  return { ok: true, data: created };
}

export function listMessages(): MessageView[] {
  return getDb()
    .select()
    .from(messages)
    .orderBy(desc(messages.createdAt))
    .all()
    .map(toMessage);
}

export function pending(id: string, token: string): Result<MessageView[]> {
  if (!deviceByToken(id, token)) return fail(401, "Device token required");
  const rows = getDb()
    .select()
    .from(messages)
    .where(and(eq(messages.deviceId, id), eq(messages.status, "queued"), eq(messages.direction, "out")))
    .all()
    .map(toMessage);
  return { ok: true, data: rows };
}

export function report(
  id: string,
  token: string,
  messageId: string,
  status: string,
  error: string | null,
): Result<MessageView> {
  if (!deviceByToken(id, token)) return fail(401, "Device token required");
  if (status !== "sent" && status !== "delivered" && status !== "failed") {
    return fail(400, "Status must be sent, delivered, or failed");
  }
  const db = getDb();
  const row = db.select().from(messages).where(eq(messages.id, messageId)).get();
  if (!row || row.deviceId !== id) return fail(404, "Message not found");
  const current = rank[row.status] ?? 0;
  const next = rank[status] ?? 0;
  if (status !== "failed" && next < current) {
    return { ok: true, data: toMessage(row) };
  }
  const now = Date.now();
  db.update(messages)
    .set({ status, error: status === "failed" ? error : null, updatedAt: now })
    .where(eq(messages.id, messageId))
    .run();
  const updated = db.select().from(messages).where(eq(messages.id, messageId)).get();
  if (!updated) return fail(404, "Message not found");
  return { ok: true, data: toMessage(updated) };
}

export type InboxRow = {
  providerId: string;
  address: string;
  body: string;
  direction: "in" | "out";
};

export function ingestInbox(id: string, token: string, rows: InboxRow[]): Result<{ inserted: number }> {
  if (!deviceByToken(id, token)) return fail(401, "Device token required");
  const db = getDb();
  let inserted = 0;
  const now = Date.now();
  for (const row of rows) {
    if (!row.providerId || (row.direction !== "in" && row.direction !== "out")) continue;
    const existing = db.select().from(messages).where(eq(messages.providerId, row.providerId)).get();
    if (existing) continue;
    if (row.direction === "out") {
      const match = db
        .select()
        .from(messages)
        .where(
          and(
            eq(messages.deviceId, id),
            eq(messages.direction, "out"),
            eq(messages.address, row.address),
            eq(messages.body, row.body),
            gt(messages.createdAt, now - MATCH_MS),
          ),
        )
        .get();
      if (match) {
        db.update(messages).set({ providerId: row.providerId, updatedAt: now }).where(eq(messages.id, match.id)).run();
        continue;
      }
    }
    db.insert(messages)
      .values({
        id: randomUUID(),
        deviceId: id,
        direction: row.direction === "in" ? "in" : "out",
        address: row.address,
        body: row.body ?? "",
        status: row.direction === "in" ? "received" : "sent",
        providerId: row.providerId,
        error: null,
        createdAt: now,
        updatedAt: now,
      })
      .run();
    inserted += 1;
  }
  return { ok: true, data: { inserted } };
}

function wakePhone() {
  if (process.env.SIMDESK_WAKE !== "1") return;
  const adb = process.env.ADB_PATH || "adb";
  const serial = process.env.ADB_SERIAL;
  const args = ["shell", "am", "broadcast", "-a", "dev.simdesk.gateway.WAKE", "-n", "dev.simdesk.gateway/.WakeReceiver"];
  if (serial) args.unshift("-s", serial);
  execFile(/* turbopackIgnore: true */ adb, args, { timeout: 4000 }, () => undefined);
}
