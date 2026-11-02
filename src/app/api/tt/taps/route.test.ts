import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/app/tt/publishedLinksPage", () => ({ publishedLinksPageButtons: vi.fn() }));
vi.mock("@/lib/links/tapRateLimit", () => ({ checkTapRateLimit: vi.fn() }));

import { publishedLinksPageButtons } from "@/app/tt/publishedLinksPage";
import { recordTap } from "@/lib/links/tapCounts";
import { checkTapRateLimit } from "@/lib/links/tapRateLimit";

import { GET } from "./route";

const request = () => GET(new Request("https://withjosephine.com/api/tt/taps"));

beforeEach(() => {
  vi.mocked(checkTapRateLimit).mockResolvedValue(true);
  vi.mocked(publishedLinksPageButtons).mockResolvedValue([
    { key: "home", label: "Home", href: "/", destination: "home", standOut: false, position: 1 },
    { key: "reading:r1", label: "Birth Chart", href: "/book/birth-chart", destination: "reading", standOut: false, position: 2 },
  ]);
});

describe("GET /api/tt/taps", () => {
  it("returns only the button words and tap counts, in page order, for the hosted Studio", async () => {
    await recordTap("reading:r1");
    await recordTap("reading:r1");

    const response = await request();

    expect(response.status).toBe(200);
    expect(response.headers.get("access-control-allow-origin")).toBe("https://withjosephine.sanity.studio");
    expect(await response.json()).toEqual({
      buttons: [
        { key: "home", label: "Home", last7Days: 0, last30Days: 0 },
        { key: "reading:r1", label: "Birth Chart", last7Days: 2, last30Days: 2 },
      ],
    });
  });

  it("answers 429 when over the limit", async () => {
    vi.mocked(checkTapRateLimit).mockResolvedValue(false);

    expect((await request()).status).toBe(429);
  });
});
