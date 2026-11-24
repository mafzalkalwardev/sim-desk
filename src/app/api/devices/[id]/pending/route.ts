import { fromResult } from "@/lib/http";
import { bearer, pending } from "@/lib/messages";

type Context = { params: Promise<{ id: string }> };

export async function GET(request: Request, context: Context) {
  const { id } = await context.params;
  return fromResult(pending(id, bearer(request.headers.get("authorization"))), (rows) => ({
    messages: rows,
  }));
}
