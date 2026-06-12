import {
  LIBRARY_VIEW_LIST_STATE,
  LIBRARY_VIEW_SIGN_IN_STATE,
  LIBRARY_VIEW_SINGLE_READING_STATE,
} from "@story-fixtures/pages/myReadings";
import type { Meta, StoryObj } from "@storybook/react";

import { MY_GIFTS_PAGE_DEFAULTS, MY_READINGS_PAGE_DEFAULTS } from "@/data/defaults";

import { LibraryView } from "./LibraryView";

const sharedArgs = {
  readingsCopy: MY_READINGS_PAGE_DEFAULTS,
  giftsCopy: MY_GIFTS_PAGE_DEFAULTS,
};

const meta: Meta<typeof LibraryView> = {
  title: "Pages/MyReadings",
  component: LibraryView,
  parameters: {
    layout: "fullscreen",
    nextjs: {
      appDirectory: true,
      navigation: {
        pathname: "/my-readings",
        query: {},
      },
    },
  },
  args: sharedArgs,
};
export default meta;

type Story = StoryObj<typeof LibraryView>;

export const WithReadings: Story = {
  args: { state: LIBRARY_VIEW_LIST_STATE },
};

export const SingleReadingMobile: Story = {
  args: { state: LIBRARY_VIEW_SINGLE_READING_STATE },
  parameters: {
    viewport: {
      viewports: {
        mobile390: {
          name: "Mobile 390",
          styles: { width: "390px", height: "844px" },
          type: "mobile",
        },
      },
      defaultViewport: "mobile390",
    },
    chromatic: { viewports: [390] },
  },
};

export const SignIn: Story = {
  args: { state: LIBRARY_VIEW_SIGN_IN_STATE },
};
