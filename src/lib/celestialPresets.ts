import type { ComponentProps } from "react";

import type { CelestialOrb } from "@/components/CelestialOrb";

type OrbPreset = Omit<ComponentProps<typeof CelestialOrb>, "className">;

type OrbColorToken = "j-accent" | "j-rose" | "j-blush";

function orbGradient(colorToken: OrbColorToken): string {
  return `radial-gradient(circle, var(--${colorToken}) 0%, transparent 70%)`;
}

export const PAGE_ORBS: OrbPreset[] = [
  {
    color: orbGradient("j-accent"),
    size: 420,
    top: "-12%",
    right: "-12%",
    opacity: 0.4,
  },
  {
    color: orbGradient("j-rose"),
    size: 370,
    bottom: "4%",
    left: "-12%",
    opacity: 0.4,
  },
];

export const HERO_ORBS: OrbPreset[] = [
  {
    color: orbGradient("j-accent"),
    size: 700,
    top: "-25%",
    left: "-20%",
    opacity: 0.4,
  },
  {
    color: orbGradient("j-blush"),
    size: 580,
    bottom: "-18%",
    right: "-17%",
    opacity: 0.4,
  },
];
