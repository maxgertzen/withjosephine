import type { Meta, StoryObj } from "@storybook/react";
import { userEvent, within } from "storybook/test";

import { GIFT_DEFAULTS, PAYMENT_BUTTON_TEXT_FALLBACK } from "@/data/defaults";

import { GiftSheet } from "./GiftSheet";

const NOTE =
  "Happy birthday, love. I hope this gives you some of the clarity you've been looking for this year. Take your time with it, there is no rush at all. Read it slowly, then read it again when the season turns and see what has changed.";

const meta: Meta<typeof GiftSheet> = {
  title: "Components/Booking/GiftSheet",
  component: GiftSheet,
  args: {
    open: true,
    onClose: () => {},
    reading: { slug: "birth-chart", name: "Birth Chart Reading", price: "$89" },
    content: GIFT_DEFAULTS,
    paymentButtonText: PAYMENT_BUTTON_TEXT_FALLBACK,
    loadingStateCopy: "One moment - taking you to checkout.",
    endpoint: null,
  },
  parameters: { layout: "fullscreen" },
};
export default meta;

type Story = StoryObj<typeof GiftSheet>;

async function fillSheet(canvasElement: HTMLElement) {
  const body = within(canvasElement.ownerDocument.body);
  await userEvent.type(body.getByLabelText(/Your first name/), "Dana");
  await userEvent.click(body.getByLabelText(/A note for them/));
  await userEvent.paste(NOTE);
  await userEvent.click(body.getByRole("checkbox"));
  return body;
}

export const Open: Story = {};

export const Filled: Story = {
  play: async ({ canvasElement }) => {
    await fillSheet(canvasElement);
  },
};

export const Errors: Story = {
  play: async ({ canvasElement }) => {
    const body = within(canvasElement.ownerDocument.body);
    await userEvent.click(body.getByRole("button", { name: PAYMENT_BUTTON_TEXT_FALLBACK }));
  },
};

export const Submitting: Story = {
  args: { endpoint: "/api/gift/purchase" },
  beforeEach: () => {
    const originalFetch = globalThis.fetch;
    globalThis.fetch = () => new Promise<Response>(() => {});
    return () => {
      globalThis.fetch = originalFetch;
    };
  },
  play: async ({ canvasElement }) => {
    const body = await fillSheet(canvasElement);
    await userEvent.click(body.getByRole("button", { name: PAYMENT_BUTTON_TEXT_FALLBACK }));
  },
};
