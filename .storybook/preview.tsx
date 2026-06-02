import "../src/styles/globals.css";

import type { Preview } from "@storybook/react";

import { StyleProvider } from "../src/components/StyleProvider";

const preview: Preview = {
  parameters: {
    backgrounds: {
      default: "cream",
      values: [
        { name: "cream", value: "#FAF8F4" },
        { name: "midnight", value: "#0D0B1A" },
        { name: "warm", value: "#F5F0E8" },
      ],
    },
    styleProvider: true,
  },
  decorators: [
    (Story, context) => {
      if (context.parameters?.styleProvider === false) {
        return <Story />;
      }
      return (
        <StyleProvider>
          <Story />
        </StyleProvider>
      );
    },
  ],
};

export default preview;
