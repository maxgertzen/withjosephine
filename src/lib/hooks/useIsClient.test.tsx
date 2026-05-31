import { renderHook } from "@testing-library/react";
import { renderToString } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { useIsClient } from "./useIsClient";

function Probe() {
  return <span data-testid="client-flag">{String(useIsClient())}</span>;
}

describe("useIsClient", () => {
  it("returns true in a client (jsdom) render", () => {
    const { result } = renderHook(() => useIsClient());
    expect(result.current).toBe(true);
  });

  it("returns false when rendered to a server string", () => {
    const html = renderToString(<Probe />);
    expect(html).toContain(">false<");
  });
});
