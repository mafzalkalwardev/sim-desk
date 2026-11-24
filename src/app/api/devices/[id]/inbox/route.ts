import { fromResult, jsonError } from "@/lib/http";
import { bearer, ingestInbox, type InboxRow } from "@/lib/messages";

type Context = { params: Promise<{ id: string }> };

export async function POST(request: Request, context: Context) {
  const { id } = await context.params;
  const body = await request.json().catch(() => null);
  if (!body || !Array.isArray(body.messages)) return jsonError(400, "Messages are required");
  const rows: InboxRow[] = body.messages.flatMap((row: InboxRow) => {
    if (!row || typeof row.providerId !== "string" || typeof row.address !== "string") return [];
    if (row.direction !== "in" && row.direction !== "out") return [];
    return [{ providerId: row.providerId, address: row.address, body: String(row.body ?? ""), direction: row.direction }];
  });
  return fromResult(ingestInbox(id, bearer(request.headers.get("authorization")), rows));
}
