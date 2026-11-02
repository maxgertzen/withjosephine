import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import {
  LINKS_PAGE_BEACONS_LOOK_ARGS,
  LINKS_PAGE_DARK_ARGS,
  LINKS_PAGE_FULL_ARGS,
} from "../../../tests/stories/fixtures/pages/linksPage";
import { LinksPageView } from "./LinksPageView";

describe("LinksPageView", () => {
  it("renders every button as a plain link with its tracking attributes", () => {
    render(<LinksPageView {...LINKS_PAGE_FULL_ARGS} />);
    const first = screen.getByRole("link", { name: "Soul Blueprint" });
    expect(first.tagName).toBe("A");
    expect(first).toHaveAttribute("href", "/book/soul-blueprint?utm_source=tiktok&utm_medium=bio&utm_content=reading%3Ar1");
    expect(first).toHaveAttribute("data-mp-event", "links_link_click");
    expect(first).toHaveAttribute("data-mp-link-key", "reading:r1");
    expect(first).toHaveAttribute("data-mp-destination-type", "reading");
    expect(first).toHaveAttribute("data-mp-destination-label", "Soul Blueprint");
    expect(first).toHaveAttribute("data-mp-position", "1");
    expect(first).toHaveAttribute("data-mp-stand-out", "true");
    expect(first).toHaveAttribute("data-clarity-event", "tt_link_click");
    expect(first).toHaveAttribute("data-clarity-tag-tt-link", "reading:r1");
    expect(first).toHaveAttribute("data-mp-transport", "sendBeacon");
  });

  it("shows the name, the short line and the bottom line", () => {
    render(<LinksPageView {...LINKS_PAGE_FULL_ARGS} />);
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Josephine");
    expect(screen.getByText(LINKS_PAGE_FULL_ARGS.intro)).toBeInTheDocument();
    expect(screen.getByText("withjosephine.com")).toBeInTheDocument();
  });

  it("paints Becky's colours on the page and the body", () => {
    const { container } = render(<LinksPageView {...LINKS_PAGE_DARK_ARGS} />);
    const wrapper = container.firstElementChild as HTMLElement;
    expect(wrapper.style.getPropertyValue("--j-bg-primary")).toBe("#0D0B1A");
    expect(container.querySelector("style")?.textContent).toBe("body{background-color:#0D0B1A}");
  });

  it("adds no body colour when the page colour is left blank", () => {
    const { container } = render(<LinksPageView {...LINKS_PAGE_FULL_ARGS} />);
    expect(container.querySelector("style")).toBeNull();
  });
});

describe("LinksPageView buttons", () => {
  it("shows the second line under the button words and the chosen shape", () => {
    render(<LinksPageView {...LINKS_PAGE_BEACONS_LOOK_ARGS} />);
    const guide = screen.getByRole("link", { name: /What Your Moon Sign Is Trying to Protect/ });
    expect(guide).toHaveTextContent("Free 20-page guide & reflection workbook");
    expect(guide.className).toContain("rounded-none");
  });

  it("shows the email link as an icon with its label for screen readers", () => {
    render(<LinksPageView {...LINKS_PAGE_FULL_ARGS} />);
    const email = screen.getByRole("link", { name: "Email" });
    expect(email.querySelector("svg")).not.toBeNull();
  });
});
