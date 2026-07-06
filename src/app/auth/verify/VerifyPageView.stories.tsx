import type { Meta, StoryObj } from "@storybook/react";

import { MAGIC_LINK_VERIFY_PAGE_DEFAULTS } from "@/data/defaults";

import { VerifyPageView } from "./VerifyPageView";

const meta: Meta<typeof VerifyPageView> = {
  title: "Pages/AuthVerify",
  component: VerifyPageView,
  parameters: { layout: "fullscreen" },
};

export default meta;
type Story = StoryObj<typeof VerifyPageView>;

export const ConfirmEmail: Story = {
  args: {
    copy: MAGIC_LINK_VERIFY_PAGE_DEFAULTS,
    state: {
      kind: "confirm",
      token: "demo-verification-token",
      next: "/",
    },
  },
};

export const RestedLink: Story = {
  args: {
    copy: MAGIC_LINK_VERIFY_PAGE_DEFAULTS,
    state: { kind: "rested" },
  },
};
