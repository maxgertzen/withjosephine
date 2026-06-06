import {
  LETTER_VIEW_BASE_CONTENT,
  LETTER_VIEW_SHORT_CONTENT,
} from "@story-fixtures/pages/letter";
import type { Meta, StoryObj } from "@storybook/react";

import { LetterView } from "./LetterView";

const meta: Meta<typeof LetterView> = {
  title: "Pages/LetterView",
  component: LetterView,
  parameters: { layout: "fullscreen" },
  args: {
    reading: { slug: "soul-blueprint" },
    letterContent: LETTER_VIEW_BASE_CONTENT,
    aboutJosephineLinkText: "About Josephine",
  },
};
export default meta;

type Story = StoryObj<typeof LetterView>;

export const SoulBlueprint: Story = {};

export const ShortContent: Story = {
  args: {
    reading: { slug: "akashic-record" },
    letterContent: LETTER_VIEW_SHORT_CONTENT,
  },
};
