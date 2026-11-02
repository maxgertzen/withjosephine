import { render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@sanity/ui", () => {
  const passthrough = ({ children }: { children?: React.ReactNode }) => <div>{children}</div>;
  return { Box: passthrough, Card: passthrough, Flex: passthrough, Stack: passthrough, Text: passthrough };
});

const datasetMock = vi.fn(() => "production");
vi.mock("sanity", () => ({ useDataset: () => datasetMock() }));

const workerOriginMock = vi.fn((): string | null => "https://withjosephine.com");
vi.mock("../lib/siteOrigins", () => ({ workerOriginFor: () => workerOriginMock() }));

import { LinksPageStats, TAP_COUNTS_WORDS } from "./LinksPageStats";

const fetchMock = vi.fn();

beforeEach(() => {
  vi.stubGlobal("fetch", fetchMock);
  workerOriginMock.mockReturnValue("https://withjosephine.com");
});

afterEach(() => {
  fetchMock.mockReset();
  vi.unstubAllGlobals();
});

function answer(buttons: unknown[]) {
  fetchMock.mockResolvedValue(new Response(JSON.stringify({ buttons }), { status: 200 }));
}

describe("LinksPageStats", () => {
  it("shows a loading line while the counts load", () => {
    fetchMock.mockReturnValue(new Promise(() => {}));
    render(<LinksPageStats />);
    expect(screen.getByText(TAP_COUNTS_WORDS.loading)).toBeTruthy();
    expect(fetchMock).toHaveBeenCalledWith("https://withjosephine.com/api/tt/taps");
  });

  it("shows each button's words with its 7 and 30 day taps", async () => {
    answer([
      { key: "home", label: "Home", last7Days: 3, last30Days: 12 },
      { key: "reading:r1", label: "Birth Chart Reading", last7Days: 0, last30Days: 0 },
    ]);
    render(<LinksPageStats />);
    expect(await screen.findByText("Birth Chart Reading")).toBeTruthy();
    expect(screen.getByText(TAP_COUNTS_WORDS.last7Days)).toBeTruthy();
    expect(screen.getByText("12")).toBeTruthy();
    expect(screen.getAllByText("0")).toHaveLength(2);
  });

  it("says when the page has no buttons", async () => {
    answer([]);
    render(<LinksPageStats />);
    expect(await screen.findByText(TAP_COUNTS_WORDS.noButtons)).toBeTruthy();
  });

  it("says the counts could not load when the request fails", async () => {
    fetchMock.mockResolvedValue(new Response(null, { status: 500 }));
    render(<LinksPageStats />);
    expect(await screen.findByText(TAP_COUNTS_WORDS.failed)).toBeTruthy();
  });

  it("explains that counts only show in the online Studio when run locally", () => {
    workerOriginMock.mockReturnValue(null);
    render(<LinksPageStats />);
    expect(screen.getByText(TAP_COUNTS_WORDS.onlineOnly)).toBeTruthy();
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
