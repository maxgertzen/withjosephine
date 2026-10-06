import { Mail } from "lucide-react";

import { CelestialOrb } from "@/components/CelestialOrb";
import { IconDisc } from "@/components/IconDisc";
import { NAV_CLEARANCE_CLASS } from "@/components/Navigation";
import { StarField } from "@/components/StarField";
import { PAGE_ORBS } from "@/lib/celestialPresets";

export default function ThankYouLoading() {
  return (
    <div className="relative min-h-screen bg-j-cream overflow-hidden">
      <StarField count={30} className="opacity-[0.03]" />
      {PAGE_ORBS.map((orb, index) => (
        <CelestialOrb key={index} {...orb} />
      ))}
      <main
        role="status"
        aria-live="polite"
        aria-label="Loading your confirmation"
        className={`relative z-10 max-w-[720px] mx-auto px-6 pb-20 text-center ${NAV_CLEARANCE_CLASS}`}
      >
        <IconDisc icon={Mail} />
        <p className="font-display italic text-[clamp(1.5rem,3.5vw,2rem)] font-medium text-j-text-heading leading-tight">
          One moment — pulling your confirmation together.
        </p>
        <p className="font-display italic text-base text-j-text-muted mt-4">
          ✦
        </p>
      </main>
    </div>
  );
}
