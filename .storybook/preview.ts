import "../src/styles/globals.css";
import "./storybook-fonts.css";

import type { Preview } from "@storybook/react";

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
  },
};

export default preview;
