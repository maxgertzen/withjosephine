import { expect, test } from "@playwright/test";

import { CONSENT_STORAGE_KEY } from "@/lib/consent";
import { isTapCounterPath } from "@/lib/links/linksHostRouting";
import { CONSENT_REQUIRED_COOKIE } from "@/lib/region";

import { MOBILE_AND_DESKTOP } from "../helpers/viewports";

const PHONE = MOBILE_AND_DESKTOP[0].viewport;
const BUTTON_LINKS = "main > ul > li > a";
const NO_CONSENT_COUNTRY = { "cf-ipcountry": "TH" };
const CONSENT_COUNTRY = { "cf-ipcountry": "DE" };

const EXPECTED_DESTINATIONS = [
  "https://shop.beacons.ai/withjosephine",
  "/book/soul-blueprint?utm_source=tiktok&utm_medium=bio&utm_content=reading%3Areading-soul-blueprint",
  "/?utm_source=tiktok&utm_medium=bio&utm_content=home",
  "mailto:e2e-test@withjosephine.com",
  "https://cdn.sanity.io/files/e2e/e2e/workbook.pdf?dl=",
];

test.describe("Links page", () => {
  test.use({ viewport: PHONE, extraHTTPHeaders: NO_CONSENT_COUNTRY });

  test("shows the name, the short line and every button as a plain link, without scrolling sideways", async ({
    page,
    request,
    baseURL,
  }) => {
    await page.goto("/tt");
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("withjosephine");
    await expect(page.getByText("Psychological astrology & Akashic Records readings")).toBeVisible();
    const links = page.locator(BUTTON_LINKS);
    await expect(links).toHaveCount(EXPECTED_DESTINATIONS.length);
    for (const [index, destination] of EXPECTED_DESTINATIONS.entries()) {
      const href = await links.nth(index).getAttribute("href");
      if (destination.startsWith("mailto:")) {
        expect(href).toBe(destination);
        continue;
      }
      expect(isTapCounterPath(href!)).toBe(true);
      const tap = await request.get(href!, { maxRedirects: 0 });
      expect(tap.status()).toBe(307);
      expect(tap.headers()["set-cookie"]).toBeUndefined();
      expect(tap.headers().location).toBe(new URL(destination, baseURL).toString());
    }
    await expect(links.first()).toContainText("Free 20-page guide & reflection workbook");
    const scrollsSideways = await page.evaluate(
      () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
    );
    expect(scrollsSideways).toBe(false);
  });

  test("every button is at least 44px tall", async ({ page }) => {
    await page.goto("/tt");
    const heights = await page.locator(BUTTON_LINKS).evaluateAll((links) =>
      links.map((link) => link.getBoundingClientRect().height),
    );
    for (const height of heights) expect(height).toBeGreaterThanOrEqual(44);
  });

  test("uses Becky's colours on the page, the body and the buttons", async ({ page }) => {
    await page.goto("/tt");
    const colours = await page.evaluate((selector) => {
      const button = document.querySelector(selector) as HTMLElement;
      return {
        body: getComputedStyle(document.body).backgroundColor,
        button: getComputedStyle(button).backgroundColor,
        buttonWords: getComputedStyle(button).color,
      };
    }, BUTTON_LINKS);
    expect(colours).toEqual({
      body: "rgb(245, 243, 239)",
      button: "rgb(31, 30, 34)",
      buttonWords: "rgb(250, 248, 244)",
    });
  });

  test("loads the chosen name font and no other links-page font, and the layout settles", async ({ page }) => {
    const fontRequests: string[] = [];
    page.on("request", (request) => {
      if (request.resourceType() === "font") fontRequests.push(request.url());
    });
    await page.goto("/tt");
    await page.evaluate(() => document.fonts.ready);
    const nameFont = await page
      .getByRole("heading", { level: 1 })
      .evaluate((heading) => getComputedStyle(heading).fontFamily);
    expect(nameFont).toMatch(/Playfair/i);
    const shift = await page.evaluate(
      () =>
        new Promise<number>((resolve) => {
          let total = 0;
          new PerformanceObserver((list) => {
            for (const entry of list.getEntries() as (PerformanceEntry & { value: number; hadRecentInput: boolean })[]) {
              if (!entry.hadRecentInput) total += entry.value;
            }
          }).observe({ type: "layout-shift", buffered: true });
          setTimeout(() => resolve(total), 500);
        }),
    );
    expect(shift).toBeLessThan(0.1);
    expect(fontRequests.length).toBeGreaterThan(0);
  });

  test("opens a share menu for a button with the page address to copy", async ({ page }) => {
    await page.goto("/tt");
    await page.getByRole("button", { name: /^Share Soul Blueprint/ }).click();
    const dialog = page.getByRole("dialog", { name: "Share link" });
    await expect(dialog).toBeVisible();
    await expect(dialog.getByRole("link", { name: /WhatsApp/ })).toHaveAttribute("href", /withjosephine|localhost/);
    await expect(dialog.getByRole("button", { name: /Copy link/ })).toBeVisible();
    await dialog.getByRole("button", { name: "Close" }).click();
    await expect(dialog).toBeHidden();
  });

  test("shows the social icons and TikTok's player for each video", async ({ page }) => {
    await page.goto("/tt");
    await expect(page.getByRole("link", { name: "TikTok" }).locator("svg")).toBeVisible();
    await page.getByRole("heading", { name: "TikToks" }).scrollIntoViewIfNeeded();
    await expect(page.locator("iframe")).toHaveAttribute(
      "src",
      /^https:\/\/www\.tiktok\.com\/player\/v1\/7412345678901234567\?autoplay=0/,
    );
  });

  test("is kept out of search results and the sitemap", async ({ page, request }) => {
    await page.goto("/tt");
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", /noindex/);
    const sitemap = await (await request.get("/sitemap.xml")).text();
    expect(sitemap).not.toContain("/tt");
  });
});

test.describe("Links page in a country that asks for consent", () => {
  test.use({ viewport: PHONE, extraHTTPHeaders: CONSENT_COUNTRY });

  test("shows the consent banner without hiding the last button, and stores the choice", async ({ page, context }) => {
    await page.goto("/tt");
    const cookies = await context.cookies();
    expect(cookies.find((cookie) => cookie.name === CONSENT_REQUIRED_COOKIE)?.value).toBe("1");
    const banner = page.getByRole("dialog");
    await expect(banner).toBeVisible();

    const lastButton = page.locator(BUTTON_LINKS).last();
    await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
    const [buttonBox, bannerBox] = await Promise.all([lastButton.boundingBox(), banner.boundingBox()]);
    expect(buttonBox!.y + buttonBox!.height).toBeLessThanOrEqual(bannerBox!.y);

    await banner.getByRole("button", { name: "Accept" }).click();
    expect(await page.evaluate((key) => localStorage.getItem(key), CONSENT_STORAGE_KEY)).toBe("granted");
  });

  test("loads TikTok's player only after the visitor accepts or taps a video", async ({ page }) => {
    await page.goto("/tt");
    await page.getByRole("heading", { name: "TikToks" }).scrollIntoViewIfNeeded();
    await expect(page.getByRole("button", { name: /^Play video: TikToks 1/ })).toBeVisible();
    await expect(page.locator("iframe")).toHaveCount(0);
    await page.getByRole("dialog").getByRole("button", { name: "Accept" }).click();
    await expect(page.locator("iframe")).toHaveCount(1);
  });

  test("stores a decline", async ({ page }) => {
    await page.goto("/tt");
    await page.getByRole("dialog").getByRole("button", { name: "Decline" }).click();
    expect(await page.evaluate((key) => localStorage.getItem(key), CONSENT_STORAGE_KEY)).toBe("declined");
  });
});
