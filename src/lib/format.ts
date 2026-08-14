/** Ghana cedi, as a merchant would read it on a receipt. */
export function formatGhs(amount: number): string {
  return new Intl.NumberFormat("en-GH", {
    style: "currency",
    currency: "GHS",
    minimumFractionDigits: 2,
  }).format(amount);
}

/**
 * Whole days from now until `date`, floored at zero.
 *
 * Reading the clock lives here rather than in a component body: React's purity
 * rule rejects `Date.now()` during render, and a per-request value belongs in a
 * helper rather than inline in JSX regardless.
 */
export function daysUntil(date: Date): number {
  const msPerDay = 86_400_000;
  return Math.max(0, Math.ceil((date.getTime() - Date.now()) / msPerDay));
}
