import type { Meta, StoryObj } from "@storybook/react";

import { CelestialOrb } from "./CelestialOrb";

const meta: Meta<typeof CelestialOrb> = {
  title: "Decorative/CelestialOrb",
  component: CelestialOrb,
  decorators: [
    (Story) => (
      <div className="relative bg-j-bg-dark min-h-[400px] w-full">
        <Story />
      </div>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof CelestialOrb>;

export const GoldOrb: Story = {
  args: {
    color: "radial-gradient(circle, #C4A46B, transparent)",
    size: 300,
    top: "50px",
    left: "100px",
    opacity: 0.25,
    blur: 80,
  },
};

export const RoseOrb: Story = {
  args: {
    color: "radial-gradient(circle, #BF9B8B, transparent)",
    size: 250,
    top: "80px",
    left: "120px",
    opacity: 0.3,
    blur: 60,
  },
};

export const MultipleOrbs: Story = {
  render: () => (
    <div className="relative bg-j-bg-dark min-h-[400px] w-full">
      <CelestialOrb
        color="radial-gradient(circle, #C4A46B, transparent)"
        size={300}
        top="20px"
        left="50px"
        opacity={0.25}
        blur={80}
      />
      <CelestialOrb
        color="radial-gradient(circle, #BF9B8B, transparent)"
        size={200}
        top="100px"
        right="80px"
        opacity={0.2}
        blur={60}
      />
      <CelestialOrb
        color="radial-gradient(circle, #E8D5C4, transparent)"
        size={150}
        bottom="40px"
        left="200px"
        opacity={0.15}
        blur={100}
      />
    </div>
  ),
};
