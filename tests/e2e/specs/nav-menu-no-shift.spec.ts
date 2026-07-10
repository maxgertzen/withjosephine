import { expect, test } from "@playwright/test";

// Opening the mobile menu locks scroll. With classic scrollbars that removes the
// scrollbar's width; without compensation the fixed nav and the page behind slide
// right by that width (dex ccvoig0e). The custom `::-webkit-scrollbar` rule forces
// classic scrollbars in Chromium, so this is reproducible headlessly.
test.use({ viewport: { width: 390, height: 844 } });

type Layout = { contentWidth: number; navRight: number; toggleRight: number };

async function readLayout(page: import("@playwright/test").Page): Promise<Layout> {
  return page.evaluate(() => {
    const html = document.documentElement;
    const nav = html.querySelector('nav[aria-label="Primary"]')!;
    const toggle = html.querySelector<HTMLElement>(
      'nav[aria-label="Primary"] button[aria-expanded]',
    )!;
    const paddingRight = parseFloat(getComputedStyle(html).paddingRight) || 0;
    return {
      contentWidth: html.clientWidth - paddingRight,
      navRight: nav.getBoundingClientRect().right,
      toggleRight: toggle.getBoundingClientRect().right,
    };
  });
}

test.describe("Mobile nav — opening the menu keeps the page behind intact (ccvoig0e)", () => {
  test("nav edge and page content do not shift when the menu opens", async ({ page }) => {
    await page.goto("/");
    const toggle = page.getByRole("button", { name: "Open menu" });
    await expect(toggle).toBeVisible();

    const before = await readLayout(page);

    await toggle.click();
    await expect(page.getByRole("button", { name: "Close menu" })).toBeVisible();
    await page.waitForTimeout(400);

    const after = await readLayout(page);

    expect(Math.abs(after.contentWidth - before.contentWidth)).toBeLessThanOrEqual(1);
    expect(Math.abs(after.navRight - before.navRight)).toBeLessThanOrEqual(1);
    expect(Math.abs(after.toggleRight - before.toggleRight)).toBeLessThanOrEqual(1);
  });
});
