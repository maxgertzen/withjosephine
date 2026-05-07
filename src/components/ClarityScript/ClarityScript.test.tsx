import { render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { ClarityScript } from "./ClarityScript";

vi.mock("next/script", () => ({
  default: function MockScript(props: {
    id?: string;
    src?: string;
    strategy?: string;
  }) {
    return (
      <script
        data-testid="clarity-mock-script"
        data-id={props.id}
        data-strategy={props.strategy}
        data-src={props.src}
      />
    );
  },
}));

beforeEach(() => {
  vi.unstubAllEnvs();
  Object.defineProperty(window, "location", {
    value: { host: "withjosephine.com" },
    configurable: true,
  });
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("ClarityScript", () => {
  it("renders the tag script with the configured project ID on production host", () => {
    vi.stubEnv("NEXT_PUBLIC_CLARITY_PROJECT_ID", "abc123def4");
    const { getByTestId } = render(<ClarityScript />);
    const script = getByTestId("clarity-mock-script");
    expect(script.getAttribute("data-strategy")).toBe("afterInteractive");
    expect(script.getAttribute("data-src")).toBe("https://www.clarity.ms/tag/abc123def4");
    expect(script.getAttribute("data-id")).toBe("ms-clarity");
  });

  it("renders nothing when the project ID env var is unset", () => {
    vi.stubEnv("NEXT_PUBLIC_CLARITY_PROJECT_ID", "");
    const { container } = render(<ClarityScript />);
    expect(container.firstChild).toBeNull();
  });

  it("renders nothing on non-production host without TRACK_NON_PROD", () => {
    vi.stubEnv("NEXT_PUBLIC_CLARITY_PROJECT_ID", "abc123def4");
    Object.defineProperty(window, "location", {
      value: { host: "staging.withjosephine.com" },
      configurable: true,
    });
    const { container } = render(<ClarityScript />);
    expect(container.firstChild).toBeNull();
  });

  it("renders on non-production host when TRACK_NON_PROD=1", () => {
    vi.stubEnv("NEXT_PUBLIC_CLARITY_PROJECT_ID", "abc123def4");
    vi.stubEnv("NEXT_PUBLIC_TRACK_NON_PROD", "1");
    Object.defineProperty(window, "location", {
      value: { host: "staging.withjosephine.com" },
      configurable: true,
    });
    const { getByTestId } = render(<ClarityScript />);
    expect(getByTestId("clarity-mock-script")).toBeInTheDocument();
  });
});
