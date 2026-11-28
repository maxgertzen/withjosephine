import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import { LINKS_PAGE_EMAIL_FORM_DEFAULTS } from "@/data/defaults";

import { LINKS_PAGE_EMAIL_FIRST_ARGS } from "../../../tests/stories/fixtures/pages/linksPage";
import { LinksPageView } from "./LinksPageView";

const GUIDE = /What Your Moon Sign Is Trying to Protect/;

describe("a links page button that asks for an email first", () => {
  it("is a button, not a link, so the address never reaches the page", () => {
    render(<LinksPageView {...LINKS_PAGE_EMAIL_FIRST_ARGS} />);

    expect(screen.queryByRole("link", { name: GUIDE })).toBeNull();
    const guide = screen.getByRole("button", { name: GUIDE });
    expect(guide).toHaveAttribute("aria-expanded", "false");
    expect(guide).toHaveAttribute("data-mp-event", "links_link_click");
    expect(document.body.innerHTML).not.toContain("shop.beacons.ai");
  });

  it("opens the email form with the newsletter box unticked", async () => {
    render(<LinksPageView {...LINKS_PAGE_EMAIL_FIRST_ARGS} />);

    await userEvent.click(screen.getByRole("button", { name: GUIDE }));

    expect(screen.getByRole("button", { name: GUIDE })).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByText(LINKS_PAGE_EMAIL_FORM_DEFAULTS.prompt)).toBeInTheDocument();
    expect(await screen.findByLabelText(LINKS_PAGE_EMAIL_FORM_DEFAULTS.emailLabel)).toBeInTheDocument();
    expect(screen.getByRole("checkbox")).not.toBeChecked();
    expect(screen.getByRole("button", { name: LINKS_PAGE_EMAIL_FORM_DEFAULTS.submit })).toBeEnabled();
  });

  it("leaves the other buttons as plain links", () => {
    render(<LinksPageView {...LINKS_PAGE_EMAIL_FIRST_ARGS} />);

    expect(screen.getByRole("link", { name: /Soul Blueprint Reading/ })).toBeInTheDocument();
  });
});

describe("a links page button that asks for an email first while the newsletter is off", () => {
  it("shows the email form without the newsletter box", async () => {
    render(<LinksPageView {...LINKS_PAGE_EMAIL_FIRST_ARGS} newsletterConsent={null} />);

    await userEvent.click(screen.getByRole("button", { name: GUIDE }));

    expect(await screen.findByLabelText(LINKS_PAGE_EMAIL_FORM_DEFAULTS.emailLabel)).toBeInTheDocument();
    expect(screen.queryByRole("checkbox")).toBeNull();
  });
});
