import { fromResult, jsonError } from "@/lib/http";
import { bearer, heartbeat } from "@/lib/messages";

type Context = { params: Promise<{ id: string }> };

export async function POST(request: Request, context: Context) {
  const { id } = await context.params;
  const body = await request.json().catch(() => ({}));
  const battery = typeof body.battery === "number" ? body.battery : null;
  const lineNumber = typeof body.lineNumber === "string" ? body.lineNumber : null;
  const carrier = typeof body.carrier === "string" ? body.carrier : null;
  const result = heartbeat(id, bearer(request.headers.get("authorization")), battery, lineNumber, carrier);
  if (!result.ok) return jsonError(result.status, result.error);
  return fromResult(result);
}
