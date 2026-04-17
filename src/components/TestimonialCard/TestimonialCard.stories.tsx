import type { Meta, StoryObj } from "@storybook/react";

import { TestimonialCard } from "./TestimonialCard";

const meta: Meta<typeof TestimonialCard> = {
  title: "Components/TestimonialCard",
  component: TestimonialCard,
  decorators: [(Story) => <div style={{ maxWidth: 420, margin: "0 auto" }}><Story /></div>],
};

export default meta;
type Story = StoryObj<typeof TestimonialCard>;

export const Default: Story = {
  args: {
    quote: "Josephine's reading was incredibly accurate. She described patterns I've felt my whole life but could never articulate.",
    name: "Sarah M.",
    detail: "Soul Blueprint Reading",
  },
};

export const LongQuote: Story = {
  args: {
    quote: "I was skeptical at first, but Josephine's reading completely changed my perspective. She connected details from my birth chart to things happening in my life right now with such precision. The voice note format made it feel personal and warm, like talking to a trusted friend. I've recommended her to everyone I know.",
    name: "Emily R.",
    detail: "Birth Chart + Akashic Record Reading",
  },
};
