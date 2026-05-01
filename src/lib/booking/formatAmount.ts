// Format the actual amount Stripe collected, in the smallest currency unit.
// Currency codes from Stripe arrive lowercase ("usd"); Intl wants uppercase.
// Returns null when cents is unset, so callers can hide the line cleanly.
export function formatAmountPaid(
  cents: number | null | undefined,
  currency: string | null | undefined,
): string | null {
  if (cents === undefined || cents === null) return null;
  const isoCurrency = (currency ?? "USD").toUpperCase();
  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: isoCurrency,
    }).format(cents / 100);
  } catch {
    return `${(cents / 100).toFixed(2)} ${isoCurrency}`;
  }
}
