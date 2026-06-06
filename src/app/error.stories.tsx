import {
  ERROR_BOUNDARY_DEFAULT_ERROR,
  ERROR_BOUNDARY_TIMEOUT_ERROR,
} from "@story-fixtures/pages/errorBoundary";
import type { Meta, StoryObj } from "@storybook/react";

import ErrorPage from "./error";

const meta: Meta<typeof ErrorPage> = {
  title: "Pages/ErrorBoundary",
  component: ErrorPage,
  parameters: {
    layout: "fullscreen",
  },
};

export default meta;
type Story = StoryObj<typeof ErrorPage>;

const noop = () => {};

export const Default: Story = {
  args: {
    error: ERROR_BOUNDARY_DEFAULT_ERROR,
    reset: noop,
  },
};

export const TimeoutLike: Story = {
  args: {
    error: ERROR_BOUNDARY_TIMEOUT_ERROR,
    reset: noop,
  },
};
