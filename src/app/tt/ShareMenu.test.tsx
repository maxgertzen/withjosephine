import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";

import { LINKS_PAGE_DEFAULTS } from "@/data/defaults";

import { ShareMenu } from "./ShareMenu";

const ICONS = { whatsapp: "W", facebook: "F", x: "X", telegram: "T", email: "E" };

beforeAll(() => {
  HTMLDialogElement.prototype.showModal ??= function showModal(this: HTMLDialogElement) {
    this.setAttribute("open", "");
  };
  HTMLDialogElement.prototype.close ??= function close(this: HTMLDialogElement) {
    this.removeAttribute("open");
  };
});

afterEach(() => {
  vi.unstubAllGlobals();
  Reflect.deleteProperty(navigator, "share");
});

function renderMenu() {
  render(
    <ShareMenu
      label="Soul Blueprint"
      shareHref="/book/soul-blueprint"
      linkKey="reading:r1"
      words={LINKS_PAGE_DEFAULTS.shareWords}
      appIcons={ICONS}
    />,
  );
  return screen.getByRole("button", { name: "Share Soul Blueprint" });
}

function stubPointer(coarse: boolean) {
  vi.stubGlobal("matchMedia", (query: string) => ({ matches: coarse && query === "(pointer: coarse)" }));
}

describe("ShareMenu", () => {
  it("opens a share dialog with the full page address on a computer", async () => {
    stubPointer(false);
    await userEvent.click(renderMenu());

    const dialog = screen.getByRole("dialog", { hidden: true });
    expect(dialog).toHaveAttribute("open");
    expect(screen.getByRole("link", { name: /WhatsApp/, hidden: true })).toHaveAttribute(
      "href",
      `https://wa.me/?text=${encodeURIComponent(`Soul Blueprint ${window.location.origin}/book/soul-blueprint`)}`,
    );
    expect(screen.getByRole("link", { name: /WhatsApp/, hidden: true })).toHaveAttribute("data-mp-method", "whatsapp");
  });

  it("copies the address and says so", async () => {
    stubPointer(false);
    const user = userEvent.setup();
    await user.click(renderMenu());
    await user.click(screen.getByRole("button", { name: /Copy link/, hidden: true }));

    expect(await navigator.clipboard.readText()).toBe(`${window.location.origin}/book/soul-blueprint`);
    expect(screen.getByText("Link copied")).toBeInTheDocument();
  });

  it("uses the phone's own share sheet on a phone", async () => {
    stubPointer(true);
    const share = vi.fn(() => Promise.resolve());
    Object.defineProperty(navigator, "share", { value: share, configurable: true });

    await userEvent.click(renderMenu());

    expect(share).toHaveBeenCalledWith({ title: "Soul Blueprint", url: `${window.location.origin}/book/soul-blueprint` });
    expect(screen.getByRole("dialog", { hidden: true })).not.toHaveAttribute("open");
  });
});
