const NUMBER = /^\+[0-9]{8,15}$/;

export function threadKey(input: string) {
  const digits = input.replace(/\D/g, "");
  if (!digits) return input.trim();
  if (digits.startsWith("92") && digits.length >= 12) return digits.slice(2, 12);
  if (digits.startsWith("0") && digits.length === 11) return digits.slice(1);
  return digits;
}

export function canonicalAddress(input: string) {
  let digits = input.replace(/[\s()-]/g, "").replace(/^\+/, "");
  if (digits.startsWith("00")) digits = digits.slice(2);
  if (!/^\d+$/.test(digits)) return input.trim();
  if (digits.startsWith("0") && digits.length === 11) digits = `92${digits.slice(1)}`;
  const address = `+${digits}`;
  return NUMBER.test(address) ? address : input.trim();
}
