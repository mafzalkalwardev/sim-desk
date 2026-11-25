import fs from "fs";
import os from "os";
import path from "path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { resetDb } from "../db/client";
import { POST as register } from "../app/api/devices/register/route";
import { POST as pair } from "../app/api/devices/pairing/route";
import { POST as heartbeatRoute } from "../app/api/devices/[id]/heartbeat/route";
import { GET as pendingRoute } from "../app/api/devices/[id]/pending/route";
import { POST as reportRoute } from "../app/api/devices/[id]/report/route";
import { POST as inboxRoute } from "../app/api/devices/[id]/inbox/route";
import { POST as lineRoute } from "../app/api/devices/[id]/line/route";
import { GET as devicesRoute } from "../app/api/devices/route";
import { POST as queueRoute } from "../app/api/messages/route";
import { listMessages } from "./messages";

let dir = "";

beforeEach(() => {
  dir = fs.mkdtempSync(path.join(os.tmpdir(), "sim-desk-"));
  process.env.DATABASE_PATH = path.join(dir, "test.sqlite");
  process.env.OPERATOR_KEY = "test-key";
  process.env.SIMDESK_WAKE = "0";
  resetDb();
});

afterEach(() => {
  resetDb();
  fs.rmSync(dir, { recursive: true, force: true });
});

async function read(response: Response) {
  return response.json() as Promise<Record<string, unknown>>;
}

describe("handset and queue", () => {
  it("registers a phone once and rejects a missing token", async () => {
    const created = await pair(new Request("http://desk/api/devices/pairing", { method: "POST", headers: { "x-operator-key": "test-key" } }));
    expect(created.status).toBe(200);
    const pairing = await read(created);
    const registered = await register(
      new Request("http://desk/api/devices/register", {
        method: "POST",
        body: JSON.stringify({ code: pairing.code, name: "Infinix" }),
      }),
    );
    expect(registered.status).toBe(200);
    const device = await read(registered);
    expect(device.name).toBe("Infinix");

    const again = await register(
      new Request("http://desk/api/devices/register", {
        method: "POST",
        body: JSON.stringify({ code: pairing.code }),
      }),
    );
    expect(again.status).toBe(404);

    const beat = await heartbeatRoute(
      new Request("http://desk/heartbeat", { method: "POST", body: "{}" }),
      { params: Promise.resolve({ id: String(device.id) }) },
    );
    expect(beat.status).toBe(401);
  });

  it("queues a text, rejects a bad number, the rate cap, and a missing key", async () => {
    const created = await pair(new Request("http://desk/pair", { method: "POST", headers: { "x-operator-key": "test-key" } }));
    const pairing = await read(created);
    const registered = await register(
      new Request("http://desk/register", {
        method: "POST",
        body: JSON.stringify({ code: pairing.code, name: "Infinix" }),
      }),
    );
    const device = await read(registered);
    const token = String(device.token);

    const missing = await queueRoute(
      new Request("http://desk/messages", { method: "POST", body: JSON.stringify({ to: ["+15551212"], body: "hi" }) }),
    );
    expect(missing.status).toBe(401);

    const bad = await queueRoute(
      new Request("http://desk/messages", {
        method: "POST",
        headers: { "x-operator-key": "test-key" },
        body: JSON.stringify({ to: ["123"], body: "hi" }),
      }),
    );
    expect(bad.status).toBe(400);

    const queued = await queueRoute(
      new Request("http://desk/messages", {
        method: "POST",
        headers: { "x-operator-key": "test-key" },
        body: JSON.stringify({ to: ["+15551212000"], body: "hello desk" }),
      }),
    );
    expect(queued.status).toBe(200);
    const payload = await read(queued);
    const message = (payload.messages as { id: string }[])[0];

    const pulled = await pendingRoute(new Request("http://desk/pending", { headers: { authorization: `Bearer ${token}` } }), {
      params: Promise.resolve({ id: String(device.id) }),
    });
    expect(pulled.status).toBe(200);
    const pendingBody = await read(pulled);
    expect(pendingBody.messages).toHaveLength(1);

    const stranger = await pendingRoute(new Request("http://desk/pending"), {
      params: Promise.resolve({ id: String(device.id) }),
    });
    expect(stranger.status).toBe(401);

    const sent = await reportRoute(
      new Request("http://desk/report", {
        method: "POST",
        headers: { authorization: `Bearer ${token}` },
        body: JSON.stringify({ id: message.id, status: "delivered" }),
      }),
      { params: Promise.resolve({ id: String(device.id) }) },
    );
    expect(sent.status).toBe(200);

    const backwards = await reportRoute(
      new Request("http://desk/report", {
        method: "POST",
        headers: { authorization: `Bearer ${token}` },
        body: JSON.stringify({ id: message.id, status: "sent" }),
      }),
      { params: Promise.resolve({ id: String(device.id) }) },
    );
    const kept = await read(backwards);
    expect(kept.status).toBe("delivered");

    for (let i = 0; i < 9; i += 1) {
      const extra = await queueRoute(
        new Request("http://desk/messages", {
          method: "POST",
          headers: { "x-operator-key": "test-key" },
          body: JSON.stringify({ to: [`+1555121201${i}`], body: "n" }),
        }),
      );
      expect(extra.status).toBe(200);
    }
    const capped = await queueRoute(
      new Request("http://desk/messages", {
        method: "POST",
        headers: { "x-operator-key": "test-key" },
        body: JSON.stringify({ to: ["+15551212999"], body: "over" }),
      }),
    );
    expect(capped.status).toBe(429);
  });

  it("stores an inbox row once and does not copy a matching outbound", async () => {
    const created = await pair(new Request("http://desk/pair", { method: "POST", headers: { "x-operator-key": "test-key" } }));
    const pairing = await read(created);
    const registered = await register(
      new Request("http://desk/register", {
        method: "POST",
        body: JSON.stringify({ code: pairing.code }),
      }),
    );
    const device = await read(registered);
    const token = String(device.token);
    await queueRoute(
      new Request("http://desk/messages", {
        method: "POST",
        headers: { "x-operator-key": "test-key" },
        body: JSON.stringify({ to: ["+15551212000"], body: "hello desk" }),
      }),
    );

    const post = () =>
      inboxRoute(
        new Request("http://desk/inbox", {
          method: "POST",
          headers: { authorization: `Bearer ${token}` },
          body: JSON.stringify({
            messages: [
              { providerId: "in-1", address: "+15557654321", body: "reply", direction: "in" },
              { providerId: "out-1", address: "+15551212000", body: "hello desk", direction: "out" },
            ],
          }),
        }),
        { params: Promise.resolve({ id: String(device.id) }) },
      );

    const first = await post();
    expect((await read(first)).inserted).toBe(1);
    const second = await post();
    expect((await read(second)).inserted).toBe(0);
    const tape = listMessages();
    expect(tape.filter((row) => row.body === "reply")).toHaveLength(1);
    expect(tape.filter((row) => row.body === "hello desk")).toHaveLength(1);
  });

  it("keeps a saved sender number when the SIM only reports the line name", async () => {
    const created = await pair(new Request("http://desk/pair", { method: "POST", headers: { "x-operator-key": "test-key" } }));
    const pairing = await read(created);
    const registered = await register(
      new Request("http://desk/register", {
        method: "POST",
        body: JSON.stringify({ code: pairing.code, name: "Infinix" }),
      }),
    );
    const device = await read(registered);
    const token = String(device.token);
    const id = String(device.id);

    const named = await heartbeatRoute(
      new Request("http://desk/heartbeat", {
        method: "POST",
        headers: { authorization: `Bearer ${token}` },
        body: JSON.stringify({ battery: 90, carrier: "Zong" }),
      }),
      { params: Promise.resolve({ id }) },
    );
    expect(named.status).toBe(200);
    const namedBody = await read(named);
    expect(namedBody.carrier).toBe("Zong");
    expect(namedBody.lineNumber).toBeNull();

    const saved = await lineRoute(
      new Request("http://desk/line", {
        method: "POST",
        headers: { "x-operator-key": "test-key" },
        body: JSON.stringify({ lineNumber: "+923001234567" }),
      }),
      { params: Promise.resolve({ id }) },
    );
    expect(saved.status).toBe(200);

    await heartbeatRoute(
      new Request("http://desk/heartbeat", {
        method: "POST",
        headers: { authorization: `Bearer ${token}` },
        body: JSON.stringify({ battery: 90, carrier: "Zong" }),
      }),
      { params: Promise.resolve({ id }) },
    );
    const listed = await devicesRoute(new Request("http://desk/devices", { headers: { "x-operator-key": "test-key" } }));
    const row = ((await read(listed)).devices as { lineNumber: string; carrier: string }[])[0];
    expect(row.lineNumber).toBe("+923001234567");
    expect(row.carrier).toBe("Zong");
  });
});
