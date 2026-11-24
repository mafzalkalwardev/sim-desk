import { createHash, randomBytes, timingSafeEqual } from "crypto";

export type Failure = { ok: false; status: number; error: string };
export type Success<T> = { ok: true; data: T };
export type Result<T> = Success<T> | Failure;

export function fail(status: number, error: string): Failure {
  return { ok: false, status, error };
}

export function hashSecret(value: string) {
  return createHash("sha256").update(value).digest("hex");
}

export function newToken() {
  return randomBytes(32).toString("hex");
}

function same(left: string, right: string) {
  const a = Buffer.from(left);
  const b = Buffer.from(right);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

export function checkOperator(header: string | null): Result<true> {
  const expected = process.env.OPERATOR_KEY ?? "";
  if (!expected) return fail(503, "OPERATOR_KEY is not set");
  if (!header || !same(header, expected)) return fail(401, "Operator key required");
  return { ok: true, data: true };
}
