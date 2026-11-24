import { NextResponse } from "next/server";
import type { Result } from "./auth";

export function jsonError(status: number, error: string) {
  return NextResponse.json({ error }, { status });
}

export function fromResult<T>(result: Result<T>, map: (data: T) => unknown = (data) => data) {
  if (!result.ok) return jsonError(result.status, result.error);
  return NextResponse.json(map(result.data));
}
