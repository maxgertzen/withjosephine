import type { Meta, StoryObj } from "@storybook/react";

import { ContactForm } from "./ContactForm";

const meta: Meta<typeof ContactForm> = {
  title: "Components/ContactForm",
  component: ContactForm,
  decorators: [(Story) => <div style={{ maxWidth: 640, margin: "0 auto" }}><Story /></div>],
};

export default meta;
type Story = StoryObj<typeof ContactForm>;

export const Default: Story = {};

export const WithCustomContent: Story = {
  args: {
    content: {
      sectionTag: "✦ Reach Out",
      heading: "let's connect",
      description: "Have a question? I'm here to help.",
      submitText: "Send",
    },
  },
};
