// The Tunisian dinar has 3 decimals: 1 TND = 1000 millimes. Prices are stored
// and calculated as integer millimes, and only turned into text for display.
const formatter = new Intl.NumberFormat("fr-TN", {
  minimumFractionDigits: 3,
  maximumFractionDigits: 3,
});

export function formatMillimes(millimes: number) {
  return `${formatter.format(millimes / 1000)} DT`;
}

// "12", "12.5", "12,500" -> millimes. Returns null for anything that isn't a
// plain non-negative amount with at most 3 decimals.
export function parseDinars(input: string): number | null {
  const cleaned = input.trim().replace(",", ".");
  const match = /^(\d{1,7})(?:\.(\d{1,3}))?$/.exec(cleaned);

  if (!match) return null;

  return Number(match[1]) * 1000 + Number((match[2] ?? "").padEnd(3, "0"));
}

// Millimes -> the text an admin edits in a price field ("12.500").
export function millimesToInput(millimes: number) {
  return (millimes / 1000).toFixed(3);
}

// Just the number ("12,500"), for places that style the "DT" separately.
export function formatAmount(millimes: number) {
  return formatter.format(millimes / 1000);
}
