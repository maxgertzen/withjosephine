import { expect, test } from "@playwright/test";

import { HERO_DEFAULTS } from "@/data/defaults";

test("text typed in the Studio keeps its line breaks and blank lines on the page", async ({ page }) => {
  await page.goto("/");
  const [firstParagraph, secondParagraph] = HERO_DEFAULTS.introBody.split("\n\n");
  const intro = page.locator("p", { hasText: firstParagraph.slice(0, 40) });

  const shown = await intro.evaluate((element) => (element as HTMLElement).innerText);

  expect(shown).toBe(`${firstParagraph}\n\n${secondParagraph}`);
});
