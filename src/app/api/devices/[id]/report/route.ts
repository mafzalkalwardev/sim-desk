import { fromResult, jsonError } from "@/lib/http";
import { bearer, report } from "@/lib/messages";

type Context = { params: Promise<{ id: string }> };

export async function POST(request: Request, context: Context) {
  const { id } = await context.params;
  const body = await request.json().catch(() => null);
  if (!body || typeof body.id !== "string" || typeof body.status !== "string") {
    return jsonError(400, "Message id and status are required");
  }
  const error = typeof body.error === "string" ? body.error : null;
  return fromResult(report(id, bearer(request.headers.get("authorization")), body.id, body.status, error));
}
