import type { Meta, StoryObj } from "@storybook/react";

import { BookingForm } from "./BookingForm";

const meta: Meta<typeof BookingForm> = {
  title: "Components/BookingForm",
  component: BookingForm,
  decorators: [(Story) => <div style={{ maxWidth: 540, margin: "0 auto" }}><Story /></div>],
};

export default meta;
type Story = StoryObj<typeof BookingForm>;

export const Default: Story = {
  args: {
    reading: {
      subtitle: "Astrology + Akashic Records",
      price: "$179",
      stripePaymentLink: "https://buy.stripe.com/test_example",
    },
    content: {
      emailLabel: "Your Email",
      emailDisclaimer: "Used only to deliver your reading.",
      paymentButtonText: "Proceed to Payment",
      securityNote: "Secure payment via Stripe.",
      entertainmentAcknowledgment:
        "I understand that this reading is for entertainment and spiritual exploration purposes.",
      coolingOffAcknowledgment:
        "I understand that digital readings are delivered within 7 days and I waive my cooling-off period.",
    },
  },
};

export const MissingPaymentLink: Story = {
  args: {
    reading: {
      subtitle: "Birth Chart Reading",
      price: "$99",
      stripePaymentLink: "",
    },
    content: {
      emailLabel: "Your Email",
      emailDisclaimer: "Used only to deliver your reading.",
      paymentButtonText: "Proceed to Payment",
      securityNote: "Secure payment via Stripe.",
      entertainmentAcknowledgment:
        "I understand that this reading is for entertainment and spiritual exploration purposes.",
      coolingOffAcknowledgment:
        "I understand that digital readings are delivered within 7 days and I waive my cooling-off period.",
    },
  },
};
