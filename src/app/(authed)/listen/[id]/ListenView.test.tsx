import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { LISTEN_PAGE_DEFAULTS } from "@/data/defaults";

import { ListenView } from "./ListenView";

const deliveredState = {
  kind: "delivered" as const,
  readingName: "Soul Blueprint",
  voiceNoteAudioPath: "/api/listen/sub_1/audio",
  pdfDownloadPath: "/api/listen/sub_1/pdf",
  showWelcomeRibbon: false,
  recipientName: null,
};

describe("ListenView delivered surface, audio element", () => {
  it("renders the voice note with preload=none so no request fires on page load", () => {
    const { container } = render(
      <ListenView copy={LISTEN_PAGE_DEFAULTS} state={deliveredState} />,
    );
    const audio = container.querySelector("audio");
    expect(audio).not.toBeNull();
    // preload="none" is the load-time-burst guard: the browser fetches nothing
    // until the user taps play. Anything else (metadata/auto) probes on load and
    // reopens the parallel-request storm that tripped LISTEN_ASSET_LIMITER.
    expect(audio?.getAttribute("preload")).toBe("none");
    expect(audio?.getAttribute("src")).toBe("/api/listen/sub_1/audio");
  });
});

describe("ListenView delivered surface, recipient greeting (yf5ciq64)", () => {
  it("renders nothing in place of the greeting when recipientName is null (self-purchase path)", () => {
    const { queryByTestId } = render(
      <ListenView copy={LISTEN_PAGE_DEFAULTS} state={deliveredState} />,
    );
    expect(queryByTestId("listen-recipient-greeting")).toBeNull();
  });

  it("renders the greeting with {recipientName} substituted when present (gift recipient path)", () => {
    const { getByTestId } = render(
      <ListenView
        copy={LISTEN_PAGE_DEFAULTS}
        state={{ ...deliveredState, recipientName: "Bob" }}
      />,
    );
    const greeting = getByTestId("listen-recipient-greeting");
    expect(greeting.textContent).toContain("Bob");
    expect(greeting.textContent).not.toContain("{recipientName}");
  });
});
