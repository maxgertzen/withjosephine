import { fireEvent, render, screen } from "@testing-library/react";
import Link from "next/link";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { PreviewLinkRouter } from "./PreviewLinkRouter";

const push = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ push }) }));

function renderWithLink(href: string, target?: string) {
  render(
    <>
      <PreviewLinkRouter />
      <a href={href} target={target}>
        link
      </a>
    </>,
  );
  return screen.getByText("link");
}

beforeEach(() => push.mockClear());

describe("PreviewLinkRouter", () => {
  it.each([
    ["/", "/preview"],
    ["/#readings", "/preview#readings"],
    ["/book/soul-blueprint", "/preview/book/soul-blueprint"],
    ["/notes", "/preview/notes"],
    ["/notes/birth-time", "/preview/notes/birth-time"],
    ["/privacy", "/preview/privacy"],
  ])("keeps a click on %s inside the preview at %s", (href, previewHref) => {
    fireEvent.click(renderWithLink(href));
    expect(push).toHaveBeenCalledWith(previewHref);
  });

  it.each(["/preview/notes/birth-time", "/thank-you/abc", "https://www.tiktok.com/@withjosephine"])(
    "leaves %s to the browser",
    (href) => {
      fireEvent.click(renderWithLink(href));
      expect(push).not.toHaveBeenCalled();
    },
  );

  it.each([
    ["a new-tab link", "_blank", {}],
    ["a cmd-click", undefined, { metaKey: true }],
  ])("leaves %s to the browser", (_case, target, modifiers) => {
    fireEvent.click(renderWithLink("/notes", target), modifiers);
    expect(push).not.toHaveBeenCalled();
  });

  it("lets the link's own click handler run before moving the preview", () => {
    const onClick = vi.fn();
    render(
      <>
        <PreviewLinkRouter />
        <Link href="/book/birth-chart" onClick={onClick}>
          other reading
        </Link>
      </>,
    );
    fireEvent.click(screen.getByText("other reading"));
    expect(onClick).toHaveBeenCalledWith(expect.objectContaining({ defaultPrevented: false }));
    expect(push).toHaveBeenCalledWith("/preview/book/birth-chart");
  });
});
