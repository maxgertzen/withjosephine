import type { Meta, StoryObj } from "@storybook/react";
import { userEvent, within } from "storybook/test";

import { GIFT_DEFAULTS } from "@/data/defaults";
import { GIFT_CHECK_API_ROUTE } from "@/lib/http/routes";

import { RedeemSheet } from "./RedeemSheet";

const CODE = "K7M2 QX9P H4TR";

const meta: Meta<typeof RedeemSheet> = {
  title: "Components/Booking/RedeemSheet",
  component: RedeemSheet,
  args: {
    open: true,
    onClose: () => {},
    readingSlug: "birth-chart",
    content: GIFT_DEFAULTS,
    endpoint: null,
  },
  parameters: { layout: "fullscreen" },
};
export default meta;

type Story = StoryObj<typeof RedeemSheet>;

function stubFetch(response: () => Promise<Response>) {
  return () => {
    const originalFetch = globalThis.fetch;
    globalThis.fetch = response;
    return () => {
      globalThis.fetch = originalFetch;
    };
  };
}

function checkResult(body: unknown) {
  return stubFetch(() => Promise.resolve(new Response(JSON.stringify(body), { status: 200 })));
}

async function redeem(canvasElement: HTMLElement) {
  const body = within(canvasElement.ownerDocument.body);
  await userEvent.type(body.getByLabelText(GIFT_DEFAULTS.codeFieldLabel), CODE);
  await userEvent.click(body.getByRole("button", { name: GIFT_DEFAULTS.redeemButtonLabel }));
}

export const Open: Story = {};

export const Empty: Story = {
  play: async ({ canvasElement }) => {
    const body = within(canvasElement.ownerDocument.body);
    await userEvent.click(body.getByRole("button", { name: GIFT_DEFAULTS.redeemButtonLabel }));
  },
};

export const Checking: Story = {
  args: { endpoint: GIFT_CHECK_API_ROUTE },
  beforeEach: stubFetch(() => new Promise<Response>(() => {})),
  play: async ({ canvasElement }) => redeem(canvasElement),
};

export const WrongCode: Story = {
  args: { endpoint: GIFT_CHECK_API_ROUTE },
  beforeEach: checkResult({ result: "not_found" }),
  play: async ({ canvasElement }) => redeem(canvasElement),
};

export const OtherReading: Story = {
  args: { endpoint: GIFT_CHECK_API_ROUTE, readingSlug: "soul-blueprint" },
  beforeEach: checkResult({
    result: "other_reading",
    readingSlug: "birth-chart",
    readingName: "Birth Chart Reading",
    path: "/gift/K7M2QX9PH4TR",
  }),
  play: async ({ canvasElement }) => redeem(canvasElement),
};

export const TooManyTries: Story = {
  args: { endpoint: GIFT_CHECK_API_ROUTE },
  beforeEach: checkResult({ result: "rate_limited" }),
  play: async ({ canvasElement }) => redeem(canvasElement),
};
