import { HOME_STORY_PROPS } from "@story-fixtures/pages/home";
import type { Meta, StoryObj } from "@storybook/react";

import { HomePageView } from "./HomePageView";

const meta: Meta<typeof HomePageView> = {
  title: "Pages/Home",
  component: HomePageView,
  parameters: { layout: "fullscreen" },
};

export default meta;
type Story = StoryObj<typeof HomePageView>;

export const Default: Story = {
  args: HOME_STORY_PROPS,
};
