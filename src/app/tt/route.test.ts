import { describe, expect, it } from "vitest";

import { GET } from "./route";

describe("GET /tt", () => {
  it("307-redirects to the UTM-tagged homepage", () => {
    const response = GET(new Request("https://withjosephine.com/tt"));

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe(
      "https://withjosephine.com/?utm_source=tiktok&utm_medium=bio",
    );
  });
});
