import { render } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { pathname } = vi.hoisted(() => ({ pathname: { current: "/" } }));
vi.mock("next/navigation", () => ({ usePathname: () => pathname.current }));

import { clearEntryClick, markEntryClick, pendingEntryClick } from "@/lib/intake/entryMarker";

import { EntryClickReset } from "./EntryClickReset";

beforeEach(() => {
  clearEntryClick();
});

describe("EntryClickReset", () => {
  it("drops a pending reading switch once another route loads", () => {
    markEntryClick("birth-chart", "reading_switch");
    pathname.current = "/notes";
    render(<EntryClickReset />);
    expect(pendingEntryClick("birth-chart")).toBeNull();
  });
});
