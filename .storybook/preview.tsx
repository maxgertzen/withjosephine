import "../src/styles/globals.css";

import type { Preview } from "@storybook/react";

import { footerNewsletterSlot } from "../src/components/Footer/footerNewsletterSlot";
import { NewsletterSlotProvider } from "../src/components/Footer/NewsletterContext";
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
  globalTypes: {
    newsletterBox: {
      description: "Newsletter box in the footer",
      toolbar: {
        title: "Newsletter box",
        icon: "email",
        items: [
          { value: "on", title: "Newsletter box on" },
          { value: "off", title: "Newsletter box off" },
        ],
        dynamicTitle: true,
      },
    },
  },
  initialGlobals: { newsletterBox: "on" },
  decorators: [
    (Story, context) => (
      <NewsletterSlotProvider slot={footerNewsletterSlot({ show: context.globals.newsletterBox !== "off" })}>
        <Story />
      </NewsletterSlotProvider>
    ),
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
