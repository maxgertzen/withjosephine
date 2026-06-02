import type { Meta, StoryObj } from "@storybook/react";

import { type LetterContent, LetterView } from "./LetterView";

const baseContent: LetterContent = {
  letterOpener:
    "Before I read for you, I want to know a little about you. A few details, a few questions you'd like held.",
  letterBridge: "Take your time with this. There's no wrong answer.",
  letterClosing:
    "I can't wait to connect with you through your reading.\nWith love, Josephine ✦",
  dropCapCta: "Tell me about you →",
  dropCapCaption:
    "The intake form: about five minutes. You'll review before paying.",
};

const meta: Meta<typeof LetterView> = {
  title: "Pages/LetterView",
  component: LetterView,
  parameters: { layout: "fullscreen" },
  args: {
    reading: { slug: "soul-blueprint" },
    letterContent: baseContent,
    aboutJosephineLinkText: "About Josephine",
  },
};
export default meta;

type Story = StoryObj<typeof LetterView>;

export const SoulBlueprint: Story = {};

export const ShortContent: Story = {
  args: {
    reading: { slug: "akashic-record" },
    letterContent: {
      ...baseContent,
      letterOpener: "Tell me what brought you here.",
      letterBridge: "One sentence is enough.",
      dropCapCta: "Begin →",
    },
  },
};
