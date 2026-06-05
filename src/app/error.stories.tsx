import type { Meta, StoryObj } from "@storybook/react";

import ErrorPage from "./error";

const meta: Meta<typeof ErrorPage> = {
  title: "Pages/ErrorBoundary",
  component: ErrorPage,
  parameters: {
    layout: "fullscreen",
    styleProvider: false,
  },
};

export default meta;
type Story = StoryObj<typeof ErrorPage>;

const noop = () => {};

export const Default: Story = {
  args: {
    error: Object.assign(new Error("Something broke in the render path"), { digest: "abc123" }),
    reset: noop,
  },
};

export const TimeoutLike: Story = {
  args: {
    error: Object.assign(new Error("Network request timed out"), { digest: "def456" }),
    reset: noop,
  },
};
