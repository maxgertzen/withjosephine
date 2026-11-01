import {
  LINKS_PAGE_BEACONS_LOOK_ARGS,
  LINKS_PAGE_DARK_ARGS,
  LINKS_PAGE_FULL_ARGS,
  LINKS_PAGE_MINIMAL_ARGS,
} from "@story-fixtures/pages/linksPage";
import type { Meta, StoryObj } from "@storybook/react";

import { LinksPageView } from "./LinksPageView";

const meta: Meta<typeof LinksPageView> = {
  title: "Pages/TikTok links",
  component: LinksPageView,
  parameters: { layout: "fullscreen", viewport: { defaultViewport: "mobile1" } },
  args: LINKS_PAGE_FULL_ARGS,
};
export default meta;

type Story = StoryObj<typeof LinksPageView>;

export const Full: Story = {};

export const NothingSetYet: Story = { args: LINKS_PAGE_MINIMAL_ARGS };

export const DarkPage: Story = { args: LINKS_PAGE_DARK_ARGS };

export const SquareButtonsWithSecondLine: Story = { args: LINKS_PAGE_BEACONS_LOOK_ARGS };

export const DifferentFont: Story = {
  args: { fontVariables: { "--font-display-source": "Georgia, serif", "--font-body-source": "Helvetica, sans-serif" } },
};
