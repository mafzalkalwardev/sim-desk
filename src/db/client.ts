import fs from "fs";
import path from "path";
import Database from "better-sqlite3";
import { drizzle, type BetterSQLite3Database } from "drizzle-orm/better-sqlite3";
import * as schema from "./schema";

const MIGRATION = `
CREATE TABLE IF NOT EXISTS devices (
  id text primary key,
  name text not null default '',
  status text not null,
  pairing_code_hash text,
  pairing_expires_at integer,
  token_hash text,
  last_heartbeat integer,
  battery integer,
  adb_serial text,
  created_at integer not null
);
CREATE TABLE IF NOT EXISTS messages (
  id text primary key,
  device_id text not null,
  direction text not null,
  address text not null,
  body text not null,
  status text not null,
  provider_id text,
  error text,
  created_at integer not null,
  updated_at integer not null
);
CREATE UNIQUE INDEX IF NOT EXISTS messages_provider
  ON messages(provider_id) WHERE provider_id IS NOT NULL;
`;

let sqlite: Database.Database | null = null;
let cached: BetterSQLite3Database<typeof schema> | null = null;
let cachedPath = "";

export function databasePath() {
  return process.env.DATABASE_PATH || path.join(process.cwd(), "data", "sim-desk.sqlite");
}

export function getDb() {
  const file = databasePath();
  if (cached && cachedPath === file) return cached;
  fs.mkdirSync(path.dirname(file), { recursive: true });
  sqlite = new Database(file);
  sqlite.pragma("journal_mode = WAL");
  sqlite.exec(MIGRATION);
  const columns = sqlite.prepare("PRAGMA table_info(devices)").all() as { name: string }[];
  if (!columns.some((column) => column.name === "line_number")) {
    sqlite.exec("ALTER TABLE devices ADD COLUMN line_number text");
  }
  cached = drizzle(sqlite, { schema });
  cachedPath = file;
  return cached;
}

export function resetDb() {
  sqlite?.close();
  sqlite = null;
  cached = null;
  cachedPath = "";
}
