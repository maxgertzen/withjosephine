import type { Meta, StoryObj } from "@storybook/react";

import { Loader } from "./Loader";

const meta: Meta<typeof Loader> = {
  title: "Feedback/Loader",
  component: Loader,
  argTypes: {
    size: {
      control: "select",
      options: ["sm", "md", "lg", "xl"],
    },
  },
};

export default meta;
type Story = StoryObj<typeof Loader>;

export const Default: Story = {
  args: { size: "md" },
};

export const Small: Story = {
  args: { size: "sm" },
};

export const Large: Story = {
  args: { size: "lg" },
};

export const ExtraLarge: Story = {
  args: { size: "xl" },
};

export const CustomSize: Story = {
  args: { size: 20 },
};

export const AllSizes: Story = {
  render: () => (
    <div style={{ display: "flex", alignItems: "center", gap: "4rem", flexWrap: "wrap" }}>
      {(["sm", "md", "lg", "xl"] as const).map((s) => (
        <div key={s} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "1rem" }}>
          <Loader size={s} />
          <small style={{ fontFamily: "var(--font-body)", color: "var(--j-text-muted)" }}>{s}</small>
        </div>
      ))}
    </div>
  ),
};

export const OnDarkSurface: Story = {
  args: { size: "lg" },
  decorators: [
    (Story) => (
      <div
        style={{
          background: "var(--j-bg-dark)",
          padding: "4rem",
          minHeight: "300px",
          display: "grid",
          placeItems: "center",
        }}
      >
        <Story />
      </div>
    ),
  ],
};

export const InsideButton: Story = {
  render: () => (
    <button
      style={{
        background: "var(--j-bg-interactive)",
        color: "var(--j-bg-primary)",
        border: "none",
        borderRadius: "50px",
        padding: "0.85rem 2.25rem",
        fontFamily: "var(--font-body)",
        fontSize: "0.95rem",
        letterSpacing: "0.04em",
        display: "inline-flex",
        alignItems: "center",
        gap: "0.85rem",
        cursor: "default",
      }}
    >
      <Loader size={20} />
      Sending your reading…
    </button>
  ),
};

export const InlineWithText: Story = {
  render: () => (
    <div
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: "0.85rem",
        fontFamily: "var(--font-display)",
        fontStyle: "italic",
        fontSize: "1.15rem",
        color: "var(--j-text-primary)",
      }}
    >
      <Loader size={26} />
      Preparing your chart
    </div>
  ),
};
