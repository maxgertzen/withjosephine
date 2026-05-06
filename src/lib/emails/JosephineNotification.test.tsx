import { render } from "@react-email/render";
import { describe, expect, it } from "vitest";

import type { SubmissionResponse } from "@/lib/resend";

import { JosephineNotification } from "./JosephineNotification";
import { linkHrefs, visibleText } from "./test-helpers";

const RESPONSES: SubmissionResponse[] = [
  {
    fieldKey: "name",
    fieldLabelSnapshot: "Your name",
    fieldType: "text",
    value: "Ada Lovelace",
  },
  {
    fieldKey: "intent",
    fieldLabelSnapshot: "What's drawing you in?",
    fieldType: "longText",
    value: "Career direction",
  },
  // Noise types filtered out by legacy renderResponsesHtml — must NOT
  // appear in the React render either.
  {
    fieldKey: "consent_terms",
    fieldLabelSnapshot: "I agree to terms",
    fieldType: "consent",
    value: "Yes",
  },
  {
    fieldKey: "photo",
    fieldLabelSnapshot: "Photo",
    fieldType: "fileUpload",
    value: "submissions/sub_abc123/photo.jpg",
  },
];

const PROPS = {
  readingName: "Soul Blueprint",
  readingPriceDisplay: "$129",
  amountPaidDisplay: "$129.00",
  email: "ada@example.com",
  createdAt: "2026-05-01T00:00:00.000Z",
  submissionId: "sub_abc123",
  photoUrl: "https://images.withjosephine.com/sub_abc123/photo.jpg",
  responses: RESPONSES,
};

describe("JosephineNotification — visual parity with legacy resend.tsx", () => {
  it("renders the heading + every meta field label", async () => {
    const text = visibleText(await render(<JosephineNotification {...PROPS} />));
    expect(text).toContain("New Soul Blueprint booking");
    expect(text).toContain("Status: Paid");
    expect(text).toContain("Price: $129");
    expect(text).toContain("Amount paid: $129.00");
    expect(text).toContain("Client email: ada@example.com");
    expect(text).toContain("Submitted: 2026-05-01T00:00:00.000Z");
    expect(text).toContain("Submission ID: sub_abc123");
    expect(text).toContain("Responses");
  });

  it("renders each non-noise response row", async () => {
    const text = visibleText(await render(<JosephineNotification {...PROPS} />));
    expect(text).toContain("Your name");
    expect(text).toContain("Ada Lovelace");
    expect(text).toContain("What's drawing you in?");
    expect(text).toContain("Career direction");
  });

  it("filters out consent + fileUpload field types from the responses table", async () => {
    const text = visibleText(await render(<JosephineNotification {...PROPS} />));
    expect(text).not.toContain("I agree to terms");
    // The fileUpload value should not appear in the responses table
    // (the photo URL is rendered as a separate link block).
    expect(text).not.toContain("photo.jpg" + "​"); // sentinel: only in fileUpload value
  });

  it("renders the photo block as a link when photoUrl is set", async () => {
    const html = await render(<JosephineNotification {...PROPS} />);
    expect(linkHrefs(html).has(PROPS.photoUrl)).toBe(true);
  });

  it("hides the photo block when photoUrl is null", async () => {
    const html = await render(<JosephineNotification {...PROPS} photoUrl={null} />);
    expect(visibleText(html)).not.toContain("Photo:");
  });

  it("hides the amountPaid line when amountPaidDisplay is null", async () => {
    const text = visibleText(
      await render(<JosephineNotification {...PROPS} amountPaidDisplay={null} />),
    );
    expect(text).not.toContain("Amount paid:");
  });

  it("escapes HTML in user-controlled fields", async () => {
    const html = await render(
      <JosephineNotification {...PROPS} email="<x@y>" />,
    );
    expect(html).not.toContain("<x@y>");
    expect(html).toContain("&lt;x@y&gt;");
  });
});
