import { checkOperator } from "@/lib/auth";
import { jsonError } from "@/lib/http";
import { createPairing } from "@/lib/messages";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const auth = checkOperator(request.headers.get("x-operator-key"));
  if (!auth.ok) return jsonError(auth.status, auth.error);
  return NextResponse.json(createPairing());
}
