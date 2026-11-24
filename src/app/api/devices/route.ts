import { checkOperator } from "@/lib/auth";
import { jsonError } from "@/lib/http";
import { listDevices } from "@/lib/messages";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const auth = checkOperator(request.headers.get("x-operator-key"));
  if (!auth.ok) return jsonError(auth.status, auth.error);
  return NextResponse.json({ devices: listDevices() });
}
