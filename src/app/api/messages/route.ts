import { checkOperator } from "@/lib/auth";
import { fromResult, jsonError } from "@/lib/http";
import { listMessages, queueMessages } from "@/lib/messages";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const auth = checkOperator(request.headers.get("x-operator-key"));
  if (!auth.ok) return jsonError(auth.status, auth.error);
  return NextResponse.json({ messages: listMessages() });
}

export async function POST(request: Request) {
  const auth = checkOperator(request.headers.get("x-operator-key"));
  if (!auth.ok) return jsonError(auth.status, auth.error);
  const body = await request.json().catch(() => null);
  if (!body || typeof body.body !== "string") return jsonError(400, "Message body is required");
  const to = Array.isArray(body.to) ? body.to.map(String) : typeof body.to === "string" ? [body.to] : [];
  const deviceId = typeof body.deviceId === "string" ? body.deviceId : undefined;
  return fromResult(queueMessages({ to, body: body.body, deviceId }), (rows) => ({ messages: rows }));
}
