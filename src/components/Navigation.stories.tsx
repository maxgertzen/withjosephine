import type { Meta, StoryObj } from "@storybook/react";
import { Navigation } from "./Navigation";

const meta: Meta<typeof Navigation> = {
  title: "Components/Navigation",
  component: Navigation,
  parameters: {
    layout: "fullscreen",
  },
};

export default meta;
type Story = StoryObj<typeof Navigation>;

export const Default: Story = {
  decorators: [
    (Story) => (
      <div style={{ minHeight: "200px" }}>
        <Story />
      </div>
    ),
  ],
};
