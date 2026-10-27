import { describe, expect, it, vi } from "vitest";

vi.mock("./fetch", () => ({ fetchReadingSlugs: vi.fn() }));

import { fetchReadingSlugs } from "./fetch";
import { generateReadingStaticParams } from "./readingStaticParams";

describe("generateReadingStaticParams", () => {
  it("leaves out readings switched off on the site", async () => {
    vi.mocked(fetchReadingSlugs).mockResolvedValueOnce([
      { slug: "soul-blueprint" },
      { slug: "akashic-record", onSite: false },
    ]);
    expect(await generateReadingStaticParams()).toEqual([{ readingId: "soul-blueprint" }]);
  });

  it("builds no page when every reading is switched off", async () => {
    vi.mocked(fetchReadingSlugs).mockResolvedValueOnce([{ slug: "akashic-record", onSite: false }]);
    expect(await generateReadingStaticParams()).toEqual([]);
  });
});
