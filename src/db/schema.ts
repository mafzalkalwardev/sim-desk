import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const devices = sqliteTable("devices", {
  id: text("id").primaryKey(),
  name: text("name").notNull().default(""),
  status: text("status").notNull(),
  pairingCodeHash: text("pairing_code_hash"),
  pairingExpiresAt: integer("pairing_expires_at"),
  tokenHash: text("token_hash"),
  lastHeartbeat: integer("last_heartbeat"),
  battery: integer("battery"),
  adbSerial: text("adb_serial"),
  createdAt: integer("created_at").notNull(),
});

export const messages = sqliteTable("messages", {
  id: text("id").primaryKey(),
  deviceId: text("device_id").notNull(),
  direction: text("direction").notNull(),
  address: text("address").notNull(),
  body: text("body").notNull(),
  status: text("status").notNull(),
  providerId: text("provider_id"),
  error: text("error"),
  createdAt: integer("created_at").notNull(),
  updatedAt: integer("updated_at").notNull(),
});
