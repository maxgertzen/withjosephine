import type { Meta, StoryObj } from "@storybook/react";
import { userEvent, within } from "storybook/test";

import { GIFT_DEFAULTS } from "@/data/defaults";

import { GiftSendForm } from "./GiftSendForm";

function stubFetch(status: number, body: unknown) {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => new Response(JSON.stringify(body), { status });
  return () => {
    globalThis.fetch = originalFetch;
  };
}

async function fillAndSend(canvasElement: HTMLElement, email: string) {
  const canvas = within(canvasElement);
  await userEvent.type(canvas.getByLabelText(/Their name/), "Anna");
  await userEvent.type(canvas.getByLabelText(/Their email/), email);
  await userEvent.click(canvas.getByRole("button", { name: GIFT_DEFAULTS.sendButtonLabel }));
}

const meta: Meta<typeof GiftSendForm> = {
  title: "Components/Gift/GiftSendForm",
  component: GiftSendForm,
  decorators: [
    (Story) => (
      <div className="max-w-md bg-j-cream p-6">
        <Story />
      </div>
    ),
  ],
  args: {
    token: "story-token",
    status: { state: "ready", buyerName: "Dana", hasNote: true, recipientName: null },
    copy: GIFT_DEFAULTS,
  },
};
export default meta;

type Story = StoryObj<typeof GiftSendForm>;

export const Ready: Story = {};

export const ReadyNoNote: Story = {
  args: { status: { state: "ready", buyerName: "Dana", hasNote: false, recipientName: null } },
};

export const Sent: Story = {
  beforeEach: () =>
    stubFetch(200, {
      state: "sent",
      recipientName: "Anna",
      lastSentAt: "2026-10-04T10:00:00.000Z",
    }),
  play: ({ canvasElement }) => fillAndSend(canvasElement, "anna@email.com"),
};

export const InvalidEmail: Story = {
  beforeEach: () =>
    stubFetch(400, {
      error: "Validation failed",
      fieldErrors: { recipientEmail: "invalid_email" },
    }),
  play: ({ canvasElement }) => fillAndSend(canvasElement, "anna@emailcom"),
};

export const OwnEmail: Story = {
  beforeEach: () =>
    stubFetch(400, { error: "Validation failed", fieldErrors: { recipientEmail: "own_email" } }),
  play: ({ canvasElement }) => fillAndSend(canvasElement, "dana@email.com"),
};

export const SendFailed: Story = {
  beforeEach: () => stubFetch(502, { error: "send_failed" }),
  play: ({ canvasElement }) => fillAndSend(canvasElement, "anna@email.com"),
};

export const AlreadySent: Story = {
  args: {
    status: {
      state: "sent",
      buyerName: "Dana",
      hasNote: true,
      recipientName: "Anna",
      lastSentAt: "2026-10-03T09:00:00.000Z",
    },
  },
};

export const Resending: Story = {
  args: AlreadySent.args,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole("button", { name: /Wrong address/ }));
  },
};

export const SentTwice: Story = {
  args: { status: { state: "used" } },
};

export const Opened: Story = {
  args: { status: { state: "opened" } },
};

export const LinkInvalid: Story = {
  args: { status: { state: "invalid" } },
};

export const Disabled: Story = {
  args: { disabled: true },
};
