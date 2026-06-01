import { act, render, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("@sanity/ui", () => {
  const passthrough = ({ children }: { children?: React.ReactNode }) => (
    <div>{children}</div>
  );
  return {
    Card: passthrough,
    Flex: passthrough,
    Stack: passthrough,
    Text: passthrough,
  };
});

const renderEmailPreviewMock = vi.fn();
const isPreviewTemplateKeyMock = vi.fn();

vi.mock("@/lib/emails/render-preview", () => ({
  isPreviewTemplateKey: (value: unknown) => isPreviewTemplateKeyMock(value),
  renderEmailPreview: (key: string, doc: unknown) =>
    renderEmailPreviewMock(key, doc),
}));

import { EmailPreview } from "./EmailPreview";

describe("EmailPreview iframe key-remount regression guard (dn17560j)", () => {
  it("remounts the iframe DOM node when html transitions from null to loaded", async () => {
    isPreviewTemplateKeyMock.mockReturnValue(true);

    let resolveRender: (html: string) => void = () => {};
    const pending = new Promise<string>((resolve) => {
      resolveRender = resolve;
    });
    renderEmailPreviewMock.mockReturnValue(pending);

    const displayed = {
      _type: "emailOrderConfirmation",
      _id: "doc1",
      _rev: "rev1",
      _createdAt: "2026-06-01T00:00:00Z",
      _updatedAt: "2026-06-01T00:00:00Z",
    };

    const { container } = render(
      <EmailPreview document={{ displayed }} />,
    );

    const iframeBefore = container.querySelector("iframe");
    expect(iframeBefore).not.toBeNull();
    expect(iframeBefore?.getAttribute("srcdoc")).toBe("");

    await act(async () => {
      resolveRender("<html><body>Hi</body></html>");
      await pending;
    });

    await waitFor(() => {
      const iframeAfter = container.querySelector("iframe");
      expect(iframeAfter?.getAttribute("srcdoc")).toContain("Hi");
    });

    const iframeAfter = container.querySelector("iframe");
    expect(iframeAfter).not.toBe(iframeBefore);
  });
});
