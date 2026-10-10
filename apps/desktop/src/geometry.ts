export function physicalUm(value: string, unit: string): number {
  const match = /^([+-]?)(\d+)(?:\.(\d{0,6}))?$/.exec(value.trim());
  if (!match)
    throw new Error("Enter a dimension with at most 6 decimal places");
  const factor = { mm: 1000n, cm: 10000n, in: 25400n }[unit];
  if (!factor) throw new Error("Unknown measurement unit");
  const fraction = match[3] ?? "";
  const denominator = 10n ** BigInt(fraction.length);
  const magnitude = BigInt(match[2]) * denominator + BigInt(fraction || "0");
  const rounded = (magnitude * factor + denominator / 2n) / denominator;
  const n = Number(match[1] === "-" ? -rounded : rounded);
  if (!Number.isSafeInteger(n)) throw new Error("Dimension out of range");
  return n;
}
export function csvCell(value: unknown): string {
  let s = String(value ?? "");
  if (/^[\s]*[=+\-@\t\r]/.test(s)) s = `'${s}`;
  return `"${s.replaceAll('"', '""')}"`;
}
