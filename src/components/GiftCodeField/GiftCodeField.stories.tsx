import type { Meta, StoryObj } from "@storybook/react";

import { GIFT_DEFAULTS } from "@/data/defaults";

import { GiftCodeField } from "./GiftCodeField";

const CODE = "K7M2 QX9P H4TR";

const meta: Meta<typeof GiftCodeField> = {
  title: "Components/Booking/GiftCodeField",
  component: GiftCodeField,
  args: {
    id: "intake-gift-code",
    label: GIFT_DEFAULTS.codeFieldOptionalLabel,
    checkingLabel: GIFT_DEFAULTS.codeChecking,
    value: "",
    onChange: () => {},
    checking: false,
  },
  decorators: [
    (Story) => (
      <div className="max-w-md bg-j-ivory p-6">
        <Story />
      </div>
    ),
  ],
};
export default meta;

type Story = StoryObj<typeof GiftCodeField>;

export const Empty: Story = {};

export const Checking: Story = {
  args: { value: CODE, checking: true },
};

export const WrongCode: Story = {
  args: { value: CODE, error: GIFT_DEFAULTS.codeNotFound },
};

export const OtherReading: Story = {
  args: { value: CODE, error: "This code is for the Soul Blueprint." },
};

export const TooManyTries: Story = {
  args: { value: CODE, error: GIFT_DEFAULTS.codeTooManyTries },
};
