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

  it("sets Becky's colours and fonts on the whole page, so the consent banner uses them too", () => {
    const { container } = render(
      <LinksPageView {...LINKS_PAGE_DARK_ARGS} fontVariables={{ "--font-body-source": "'__Bitter_1', serif" }} />,
    );
    const rule = container.querySelector("style")?.textContent ?? "";
    expect(rule.startsWith(":root body{")).toBe(true);
    expect(rule).toContain("--j-cream:#0D0B1A");
    expect(rule).toContain("--j-bg-primary:#0D0B1A");
    expect(rule).toContain("--font-body-source:'__Bitter_1', serif");
    expect((container.firstElementChild as HTMLElement).getAttribute("style")).toBeNull();
  });

  it("adds no style when Becky picked no colours or fonts", () => {
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

describe("LinksPageView share menu, videos and social icons", () => {
  const props = {
    ...LINKS_PAGE_FULL_ARGS,
    socialLinks: [
      { platform: "instagram", url: "https://instagram.com/withjosephine", label: "Instagram" },
      { platform: "email", url: "mailto:hello@withjosephine.com", label: "Email" },
    ],
  };

  it("puts a share button on every button except the email one", () => {
    render(<LinksPageView {...props} />);
    expect(screen.getAllByRole("button", { name: /^Share / })).toHaveLength(
      props.buttons.filter((button) => button.destination !== "email").length,
    );
    expect(screen.queryByRole("button", { name: "Share Write to me" })).toBeNull();
  });

  it("has no share buttons when the share menu is off", () => {
    render(<LinksPageView {...props} shareWords={undefined} />);
    expect(screen.queryAllByRole("button", { name: /^Share / })).toHaveLength(0);
  });

  it("shows the social links as icons", () => {
    const { container } = render(<LinksPageView {...props} />);
    expect(screen.getByRole("link", { name: "Instagram" }).querySelector("svg")).not.toBeNull();
    expect(container.querySelectorAll('a[aria-label="Email"] svg')).toHaveLength(1);
  });

  it("shows the videos under their title", () => {
    const { container } = render(<LinksPageView {...props} videoIds={["7412345678901234567"]} />);
    expect(screen.getByRole("heading", { name: "TikToks" })).toBeInTheDocument();
    expect(container.querySelectorAll("section li")).toHaveLength(1);
  });

  it("draws the round photo at the chosen size", () => {
    const { rerender } = render(<LinksPageView {...props} photoUrl="https://cdn.sanity.io/images/p/d/logo.png" />);
    expect(screen.getByRole("img", { name: props.name }).style.width).toBe("144px");
    rerender(<LinksPageView {...props} photoUrl="https://cdn.sanity.io/images/p/d/logo.png" photoSize={176} />);
    expect(screen.getByRole("img", { name: props.name }).style.width).toBe("176px");
  });

  it("writes the button words in normal letters unless capitals are chosen", () => {
    const { rerender } = render(<LinksPageView {...props} />);
    expect(screen.getAllByText("Birth Chart Reading")[0].className).not.toContain("uppercase");
    rerender(<LinksPageView {...props} buttonLetterCase="upper" />);
    expect(screen.getAllByText("Birth Chart Reading")[0].className).toContain("uppercase");
  });
});
