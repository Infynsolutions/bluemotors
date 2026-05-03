const esAR = new Intl.NumberFormat("es-AR");
const esARCurrency = new Intl.NumberFormat("es-AR", {
  style: "currency",
  currency: "ARS",
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});

export function formatNumber(n: number | string): string {
  const num = typeof n === "string" ? parseFloat(n) : n;
  if (isNaN(num)) return "";
  return esAR.format(num);
}

export function formatCurrency(n: number | string): string {
  const num = typeof n === "string" ? parseFloat(n) : n;
  if (isNaN(num)) return "";
  return esARCurrency.format(num);
}

// Parses a thousands-formatted string back to a plain number string
// "28.500.000" → "28500000"
export function parseFormattedNumber(s: string): string {
  return s.replace(/\./g, "").replace(/,/g, ".");
}

// Format as user types: strips non-digits, applies es-AR thousands separator
// "6500000" → "6.500.000"
export function formatMontoInput(value: string): string {
  const digits = value.replace(/[^\d]/g, "");
  if (!digits) return "";
  const n = parseInt(digits, 10);
  return isNaN(n) ? "" : esAR.format(n);
}

// Parse a formatted monto input back to number
// "6.500.000" → 6500000
export function parseMontoInput(value: string): number {
  const n = parseFloat(value.replace(/\./g, "") || "0");
  return isNaN(n) ? 0 : n;
}
