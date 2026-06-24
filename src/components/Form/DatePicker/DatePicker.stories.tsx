"use client";

import type { Meta, StoryObj } from "@storybook/react";
import { useState } from "react";

import { DatePicker } from "./DatePicker";

function Playground({
  initialValue,
  minAge,
}: {
  initialValue?: string;
  minAge?: number;
}) {
  const [value, setValue] = useState(initialValue ?? "");
  return (
    <div className="bg-j-cream min-h-screen p-8 flex justify-center">
      <div className="w-full max-w-sm">
        <DatePicker
          id="storybook-date"
          name="storybook-date"
          label="Date of birth"
          value={value}
          onChange={setValue}
          minAge={minAge}
        />
        <pre className="mt-4 font-body text-xs text-j-text-muted bg-j-ivory border border-j-border-subtle rounded-sm p-3">
          value: {JSON.stringify(value)}
        </pre>
      </div>
    </div>
  );
}

const meta: Meta<typeof Playground> = {
  title: "Components/Forms/DatePicker",
  component: Playground,
  parameters: {
    layout: "fullscreen",
    nextjs: { appDirectory: true },
  },
};
export default meta;

type Story = StoryObj<typeof Playground>;

export const Default: Story = {
  args: {},
};

export const WithPreselectedValue: Story = {
  args: { initialValue: "1990-09-21" },
};

export const MonthDropdownMobile: Story = {
  args: { initialValue: "1990-09-21" },
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

export const WithMinAgeWarning: Story = {
  args: {
    initialValue: `${new Date().getFullYear() - 10}-06-01`,
    minAge: 18,
  },
};
