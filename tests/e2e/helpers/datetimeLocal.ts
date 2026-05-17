import type { Page } from "@playwright/test";

/**
 * Compute a `datetime-local`-shaped value `minutes` from now, using the
 * browser's clock. `<input type="datetime-local">` is timezone-naive, so
 * computing in-browser ensures the value lands in the future regardless of
 * CI vs local timezone.
 */
export async function datetimeLocalPlus(page: Page, minutes: number): Promise<string> {
  return page.evaluate((m) => {
    const t = new Date(Date.now() + m * 60_000);
    const pad = (n: number): string => String(n).padStart(2, "0");
    return (
      `${t.getFullYear()}-${pad(t.getMonth() + 1)}-${pad(t.getDate())}` +
      `T${pad(t.getHours())}:${pad(t.getMinutes())}`
    );
  }, minutes);
}
