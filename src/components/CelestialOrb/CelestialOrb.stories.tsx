import type { Meta, StoryObj } from "@storybook/react";

import { HERO_ORBS, PAGE_ORBS } from "@/lib/celestialPresets";

import { CelestialOrb } from "./CelestialOrb";

const meta: Meta<typeof CelestialOrb> = {
  title: "Components/Decorative/CelestialOrb",
  component: CelestialOrb,
  decorators: [
    (Story) => (
      <div className="relative overflow-hidden bg-j-cream min-h-[600px] w-full">
        <Story />
      </div>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof CelestialOrb>;

export const HeroOrb: Story = {
  args: HERO_ORBS[0],
};

export const PageOrb: Story = {
  args: PAGE_ORBS[1],
};

export const HeroOrbs: Story = {
  render: () => (
    <>
      {HERO_ORBS.map((orb, index) => (
        <CelestialOrb key={index} {...orb} />
      ))}
    </>
  ),
};
