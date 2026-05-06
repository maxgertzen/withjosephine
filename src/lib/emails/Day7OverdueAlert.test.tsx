import { render } from "@react-email/render";
import { describe, expect, it } from "vitest";

import { Day7OverdueAlert } from "./Day7OverdueAlert";
import { visibleText } from "./test-helpers";

const PROPS = {
  email: "ada@example.com",
  readingName: "Akashic Record",
  submissionId: "sub_abc123",
  createdAt: "2026-04-20T00:00:00.000Z",
};

const LEGACY_BODY_LINES = [
  "Reading overdue — past 7 days",
  "The following submission is past the 7-day delivery window and has no deliveredAt set:",
  "Client: ada@example.com",
  "Reading: Akashic Record",
  "Submission ID: sub_abc123",
  "Created: 2026-04-20T00:00:00.000Z",
  "Mark deliveredAt in Studio after uploading the voice note + PDF to fire the client delivery email.",
] as const;

describe("Day7OverdueAlert — visual parity with legacy resend.tsx", () => {
  it("renders every body line from the legacy email", async () => {
    const text = visibleText(await render(<Day7OverdueAlert {...PROPS} />));
    for (const line of LEGACY_BODY_LINES) {
      expect(text).toContain(line);
    }
  });

  it("uses the serif family for the heading (legacy parity)", async () => {
    const html = await render(<Day7OverdueAlert {...PROPS} />);
    expect(html).toMatch(/Cormorant Garamond/);
  });

  it("escapes HTML in user-supplied fields", async () => {
    const html = await render(<Day7OverdueAlert {...PROPS} email="<x@y>" />);
    expect(html).not.toContain("<x@y>");
    expect(html).toContain("&lt;x@y&gt;");
  });
});
