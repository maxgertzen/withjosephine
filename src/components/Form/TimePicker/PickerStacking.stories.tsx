import type { Meta, StoryObj } from "@storybook/react";
import { useState } from "react";

import { DatePicker } from "@/components/Form/DatePicker";
import { TimePicker } from "@/components/Form/TimePicker";

function IntakeChain() {
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [unknown, setUnknown] = useState(false);
  return (
    <div className="relative min-h-screen bg-j-cream overflow-hidden" style={{ width: 375 }}>
      <main className="relative z-10 max-w-3xl mx-auto px-6 py-16">
        <article className="relative bg-j-ivory border border-j-blush rounded-sm shadow-j-card">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-2 md:inset-3 border border-j-border-gold rounded-[1px]"
          />
          <div className="relative px-6 py-10">
            <section className="grid grid-cols-1 gap-2 py-6">
              <div className="flex flex-col gap-6">
                <DatePicker
                  id="dob"
                  name="date_of_birth"
                  label="Date of birth"
                  value={date}
                  onChange={setDate}
                />
                <TimePicker
                  id="tob"
                  name="time_of_birth"
                  label="Time of birth"
                  value={unknown ? "unknown" : time}
                  onChange={setTime}
                  unknownToggle={{
                    label: "I don't know my birth time",
                    checked: unknown,
                    onChange: setUnknown,
                  }}
                />
              </div>
            </section>
          </div>
        </article>
      </main>
    </div>
  );
}

const meta: Meta<typeof IntakeChain> = {
  title: "Forms/PickerStacking",
  component: IntakeChain,
};
export default meta;

type Story = StoryObj<typeof IntakeChain>;

export const BirthDetailsColumn: Story = {};
