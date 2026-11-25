import type { Failure } from "./auth";
import { fail } from "./auth";

const NUMBER = /^\+?[0-9]{8,15}$/;

export function normalizeAddress(input: string) {
  return input.replace(/[\s()-]/g, "");
}

export function checkLine(input: string): { ok: true; data: string } | Failure {
  const address = normalizeAddress(input);
  if (!NUMBER.test(address)) return fail(400, "A number must be 8 to 15 digits");
  return { ok: true, data: address };
}

export function checkRecipients(input: string[]): { ok: true; data: string[] } | Failure {
  if (!Array.isArray(input) || input.length === 0) {
    return fail(400, "At least one recipient is required");
  }
  if (input.length > 5) return fail(400, "At most 5 recipients");
  const addresses: string[] = [];
  for (const raw of input) {
    const checked = checkLine(String(raw ?? ""));
    if (!checked.ok) return checked;
    addresses.push(checked.data);
  }
  return { ok: true, data: addresses };
}
