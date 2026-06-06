import type { Meta, StoryObj } from "@storybook/react";
import { useState } from "react";

import { Select, type SelectOption } from "./Select";

const HOUR_OPTIONS: SelectOption[] = Array.from({ length: 24 }, (_, i) => {
  const v = i.toString().padStart(2, "0");
  return { value: v, label: v };
});

const MONTH_OPTIONS: SelectOption[] = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
].map((name, idx) => ({ value: String(idx), label: name }));

function Playground({
  ariaLabel,
  placeholder,
  options,
  initial,
}: {
  ariaLabel: string;
  placeholder: string;
  options: SelectOption[];
  initial?: string;
}) {
  const [value, setValue] = useState(initial ?? "");
  return (
    <div className="bg-j-cream min-h-screen p-12">
      <div className="max-w-sm mx-auto bg-j-ivory border border-j-blush rounded-sm p-6 flex flex-col gap-6">
        <p className="font-display italic text-sm text-j-text-muted">
          Select: Radix Select styled with the cream / Cormorant / rounded design language.
          Click the trigger to open the listbox.
        </p>
        <Select
          ariaLabel={ariaLabel}
          placeholder={placeholder}
          value={value}
          onValueChange={setValue}
          options={options}
        />
        <pre className="font-body text-xs text-j-text-muted bg-j-cream border border-j-border-subtle rounded-sm p-3">
          value: {JSON.stringify(value)}
        </pre>
      </div>
    </div>
  );
}

const meta: Meta<typeof Playground> = {
  title: "Components/Forms/Select",
  component: Playground,
};

export default meta;

type Story = StoryObj<typeof Playground>;

export const Hour: Story = {
  args: {
    ariaLabel: "Hour",
    placeholder: "HH",
    options: HOUR_OPTIONS,
  },
};

export const MonthDropdown: Story = {
  args: {
    ariaLabel: "Month",
    placeholder: "Month",
    options: MONTH_OPTIONS,
  },
};

export const PreselectedValue: Story = {
  args: {
    ariaLabel: "Hour",
    placeholder: "HH",
    options: HOUR_OPTIONS,
    initial: "14",
  },
};

export const SideBySideLikeTimePicker: Story = {
  render: () => {
    return (
      <div className="bg-j-cream min-h-screen p-12">
        <div className="max-w-sm mx-auto bg-j-ivory border border-j-blush rounded-sm p-6">
          <p className="font-display italic text-sm text-j-text-muted text-center mb-3">
            Hour and minute
          </p>
          <div className="flex items-center justify-center gap-2">
            <HourMinuteDemo />
          </div>
        </div>
      </div>
    );
  },
};

function HourMinuteDemo() {
  const [hh, setHh] = useState("");
  const [mm, setMm] = useState("");
  const minutes: SelectOption[] = Array.from({ length: 12 }, (_, i) => {
    const v = (i * 5).toString().padStart(2, "0");
    return { value: v, label: v };
  });
  return (
    <>
      <Select ariaLabel="Hour" placeholder="HH" value={hh} onValueChange={setHh} options={HOUR_OPTIONS} />
      <span aria-hidden="true" className="font-display italic text-j-text-heading">
        :
      </span>
      <Select ariaLabel="Minute" placeholder="MM" value={mm} onValueChange={setMm} options={minutes} />
    </>
  );
}
