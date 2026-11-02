import { beforeEach, describe, expect, it, vi } from "vitest";

const mirrored: Promise<void>[] = [];

vi.mock("@/lib/booking/persistence/runMirror", () => ({
  runMirror: (promise: Promise<void>) => mirrored.push(promise),
}));
vi.mock("@/app/tt/publishedLinksPage", () => ({ publishedLinksPageButtons: vi.fn() }));
vi.mock("@/lib/links/tapRateLimit", () => ({ checkTapRateLimit: vi.fn() }));

import { publishedLinksPageButtons } from "@/app/tt/publishedLinksPage";
import { dbQuery } from "@/lib/booking/persistence/sqlClient";
import { checkTapRateLimit } from "@/lib/links/tapRateLimit";

import { GET } from "./route";

const PHONE = "Mozilla/5.0 (iPhone; CPU iPhone OS 18_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 musical_ly_37.5.0 BytedanceWebview/d8a21c6";
const BOOKING_HREF = "/book/birth-chart?utm_source=tiktok&utm_medium=bio&utm_content=reading%3Areading-birth-chart";

function tap(key: string, userAgent: string | null = PHONE, extraHeaders: Record<string, string> = {}) {
  const headers = new Headers({ ...(userAgent === null ? {} : { "user-agent": userAgent }), ...extraHeaders });
  return GET(new Request(`https://withjosephine.com/tt/go/${key}`, { headers }), {
    params: Promise.resolve({ key }),
  });
}

async function storedTaps() {
  await Promise.all(mirrored);
  return dbQuery<{ link_key: string; count: number }>("SELECT link_key, count FROM tt_link_taps");
}

beforeEach(() => {
  mirrored.length = 0;
  vi.mocked(checkTapRateLimit).mockResolvedValue(true);
  vi.mocked(publishedLinksPageButtons).mockResolvedValue([
    {
      key: "reading:reading-birth-chart",
      label: "Birth Chart Reading",
      href: BOOKING_HREF,
      destination: "reading",
      standOut: false,
      countsTaps: true,
      position: 1,
    },
    { key: "email:1a2b3c4d", label: "Email", href: "mailto:hello@withjosephine.com", destination: "email", standOut: false, countsTaps: false, position: 2 },
  ]);
});

describe("GET /tt/go/[key]", () => {
  it("sends a known key to its tagged destination with a 307 and counts the tap", async () => {
    const response = await tap("reading:reading-birth-chart");

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe(`https://withjosephine.com${BOOKING_HREF}`);
    expect(await storedTaps()).toEqual([{ link_key: "reading:reading-birth-chart", count: 1 }]);
  });

  it("passes an address outside the site through unchanged", async () => {
    const response = await tap("email:1a2b3c4d");

    expect(response.headers.get("location")).toBe("mailto:hello@withjosephine.com");
  });

  it("sends an unknown or malformed key back to the links page without counting", async () => {
    for (const key of ["reading:gone", "../admin", "HOME"]) {
      const response = await tap(key);
      expect(response.status).toBe(307);
      expect(response.headers.get("location")).toBe("https://withjosephine.com/tt");
    }
    expect(await storedTaps()).toEqual([]);
  });

  it("redirects crawlers and visitors with no user agent without counting", async () => {
    await tap("reading:reading-birth-chart", "Mozilla/5.0 (compatible; Googlebot/2.1)");
    await tap("reading:reading-birth-chart", null);

    expect(await storedTaps()).toEqual([]);
  });

  it("redirects link previews and prefetches without counting", async () => {
    const response = await tap("reading:reading-birth-chart", PHONE, { purpose: "prefetch" });

    expect(response.status).toBe(307);
    expect(await storedTaps()).toEqual([]);
  });

  it("sends the visitor back to the links page when the page cannot load", async () => {
    vi.mocked(publishedLinksPageButtons).mockRejectedValue(new Error("sanity down"));
    vi.spyOn(console, "error").mockImplementation(() => {});

    const response = await tap("reading:reading-birth-chart");

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe("https://withjosephine.com/tt");
  });

  it("redirects without counting when over the limit or the limiter is missing", async () => {
    vi.mocked(checkTapRateLimit).mockResolvedValue(false);

    const response = await tap("reading:reading-birth-chart");

    expect(response.status).toBe(307);
    expect(await storedTaps()).toEqual([]);
  });

});
