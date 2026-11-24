import { fromResult, jsonError } from "@/lib/http";
import { registerDevice } from "@/lib/messages";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  if (!body || typeof body.code !== "string") return jsonError(400, "Pairing code is required");
  const name = typeof body.name === "string" ? body.name : "";
  return fromResult(registerDevice(body.code, name));
}
