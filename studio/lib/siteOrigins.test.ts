import { describe, expect, it } from "vitest";

import { workerOriginFor } from "./siteOrigins";

describe("workerOriginFor", () => {
  it("returns the site of the workspace dataset from the hosted Studio", () => {
    expect(workerOriginFor("production", "https://withjosephine.sanity.studio")).toBe(
      "https://withjosephine.com",
    );
    expect(workerOriginFor("staging", "https://withjosephine.sanity.studio")).toBe(
      "https://staging.withjosephine.com",
    );
  });

  it("returns null from the local Studio or for an unknown dataset", () => {
    expect(workerOriginFor("production", "http://localhost:3333")).toBeNull();
    expect(workerOriginFor("scratch", "https://withjosephine.sanity.studio")).toBeNull();
  });
});
