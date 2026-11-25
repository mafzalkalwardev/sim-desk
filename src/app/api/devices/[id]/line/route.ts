import { checkOperator } from "@/lib/auth";
import { fromResult, jsonError } from "@/lib/http";
import { setLineNumber } from "@/lib/messages";

type Context = { params: Promise<{ id: string }> };

export async function POST(request: Request, context: Context) {
  const auth = checkOperator(request.headers.get("x-operator-key"));
  if (!auth.ok) return jsonError(auth.status, auth.error);
  const { id } = await context.params;
  const body = await request.json().catch(() => ({}));
  const lineNumber = typeof body.lineNumber === "string" ? body.lineNumber : "";
  const result = setLineNumber(id, lineNumber);
  if (!result.ok) return jsonError(result.status, result.error);
  return fromResult(result);
}
