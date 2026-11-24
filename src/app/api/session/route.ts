import { NextResponse } from "next/server";

function localHost(host: string) {
  const name = host.split(":")[0] ?? "";
  return name === "localhost" || name === "127.0.0.1" || name.startsWith("192.168.") || name.startsWith("10.");
}

export function GET(request: Request) {
  const host = request.headers.get("host") ?? "";
  if (!localHost(host)) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const key = process.env.OPERATOR_KEY ?? "";
  if (!key) return NextResponse.json({ error: "The operator key is not set" }, { status: 503 });
  return NextResponse.json({ key });
}
