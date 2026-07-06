import type { Meta, StoryObj } from "@storybook/react";

import { PrivacyExportView } from "./PrivacyExportView";

const meta: Meta<typeof PrivacyExportView> = {
  title: "Pages/PrivacyExport",
  component: PrivacyExportView,
  parameters: { layout: "fullscreen" },
};

export default meta;
type Story = StoryObj<typeof PrivacyExportView>;

export const Default: Story = {
  args: { token: "export.v1.example-token" },
};

export const InvalidLink: Story = {
  args: { token: null },
};
