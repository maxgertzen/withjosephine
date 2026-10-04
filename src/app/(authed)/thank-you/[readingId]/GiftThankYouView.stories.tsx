import type { Meta, StoryObj } from "@storybook/react";
import { userEvent, within } from "storybook/test";

import { GIFT_DEFAULTS } from "@/data/defaults";
import { ACTIVE_GIFT, giftThankYouViewProps, SHOWN_GIFT } from "@/test/fixtures/giftThankYou";

import { GiftThankYouView } from "./GiftThankYouView";

function stubNavigator(key: "share" | "clipboard", value: unknown) {
  const original = Object.getOwnPropertyDescriptor(navigator, key);
  Object.defineProperty(navigator, key, { value, configurable: true, writable: true });
  return () => {
    if (original) Object.defineProperty(navigator, key, original);
    else Reflect.deleteProperty(navigator, key);
  };
}

function withShareMenu() {
  return stubNavigator("share", async () => {});
}

const meta: Meta<typeof GiftThankYouView> = {
  title: "Pages/ThankYouGift",
  component: GiftThankYouView,
  parameters: { layout: "fullscreen" },
  args: giftThankYouViewProps(ACTIVE_GIFT),
  beforeEach: withShareMenu,
};
export default meta;

type Story = StoryObj<typeof GiftThankYouView>;

export const Active: Story = {};

export const LinkCopied: Story = {
  beforeEach: () => stubNavigator("clipboard", { writeText: async () => {} }),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole("button", { name: GIFT_DEFAULTS.copyLinkLabel }));
  },
};

export const NoShare: Story = {
  beforeEach: () => stubNavigator("share", undefined),
};

export const EditingNote: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole("button", { name: GIFT_DEFAULTS.editNoteLabel }));
  },
};

export const NoteSaved: Story = {
  beforeEach: () => {
    const originalFetch = globalThis.fetch;
    globalThis.fetch = async () => new Response(JSON.stringify({ ok: true }));
    return () => {
      globalThis.fetch = originalFetch;
    };
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole("button", { name: GIFT_DEFAULTS.editNoteLabel }));
    await userEvent.click(canvas.getByRole("button", { name: GIFT_DEFAULTS.saveNoteLabel }));
  },
};

export const SendFormOpen: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole("button", { name: GIFT_DEFAULTS.sendOpenLabel }));
  },
};

export const NoNote: Story = {
  args: giftThankYouViewProps({
    ...ACTIVE_GIFT,
    note: null,
    sendStatus: { ...ACTIVE_GIFT.sendStatus, hasNote: false },
  }),
};

export const Redeemed: Story = {
  args: giftThankYouViewProps({ kind: "redeemed", ...SHOWN_GIFT }),
};

export const PendingPayment: Story = {
  args: giftThankYouViewProps({ kind: "not_paid", buyerFirstName: SHOWN_GIFT.buyerFirstName }),
};
