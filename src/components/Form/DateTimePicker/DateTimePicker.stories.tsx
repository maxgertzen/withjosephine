import type { Meta, StoryObj } from "@storybook/react";
import { useState } from "react";

import { DateTimePicker } from "./DateTimePicker";

function Playground({
  initialValue,
  withError,
  withMin,
}: {
  initialValue?: string;
  withError?: boolean;
  withMin?: boolean;
}) {
  const [value, setValue] = useState(initialValue ?? "");
  const nowLocal = (() => {
    const d = new Date();
    const pad = (n: number) => n.toString().padStart(2, "0");
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  })();
  return (
    <div className="bg-j-cream min-h-screen p-8">
      <div className="max-w-md mx-auto bg-j-ivory border border-j-blush rounded-sm p-6 flex flex-col gap-6">
        <DateTimePicker
          id="send-at"
          name="sendAt"
          label="Send at"
          value={value}
          onChange={setValue}
          error={withError ? "Pick a future date and time" : undefined}
          min={withMin ? nowLocal : undefined}
        />
        <pre className="font-body text-xs text-j-text-muted bg-j-cream border border-j-border-subtle rounded-sm p-3 whitespace-pre-wrap break-all">
          value: {JSON.stringify(value)}
        </pre>
      </div>
    </div>
  );
}

const meta: Meta<typeof Playground> = {
  title: "Forms/DateTimePicker",
  component: Playground,
  parameters: {
    layout: "fullscreen",
  },
};
export default meta;

type Story = StoryObj<typeof Playground>;

export const Empty: Story = {};

export const WithInitialValue: Story = {
  args: {
    initialValue: "2026-06-13T15:30",
  },
};

export const WithMinNow: Story = {
  args: {
    initialValue: "",
    withMin: true,
  },
};

export const WithError: Story = {
  args: {
    initialValue: "",
    withError: true,
  },
};
