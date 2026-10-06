import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

import { CelestialOrb } from "@/components/CelestialOrb";
import { Footer } from "@/components/Footer";
import { IconDisc } from "@/components/IconDisc";
import { NAV_CLEARANCE_CLASS } from "@/components/Navigation";
import { StarField } from "@/components/StarField";
import { ThankYouGuard } from "@/components/ThankYouGuard";
import { PAGE_ORBS } from "@/lib/celestialPresets";

type ThankYouShellProps = {
  icon: LucideIcon;
  heading: string;
  subheading: string;
  children: ReactNode;
};

export function ThankYouShell({ icon, heading, subheading, children }: ThankYouShellProps) {
  return (
    <div className="relative min-h-screen bg-j-cream overflow-hidden">
      <ThankYouGuard />
      <StarField count={30} className="opacity-[0.03]" />
      {PAGE_ORBS.map((orb, index) => (
        <CelestialOrb key={index} {...orb} />
      ))}

      <main className={`relative z-10 max-w-[720px] mx-auto px-6 pb-20 text-center ${NAV_CLEARANCE_CLASS}`}>
        <IconDisc icon={icon} />

        <h1 className="font-display italic text-[clamp(2rem,5vw,3rem)] font-medium text-j-text-heading leading-tight">
          {heading}
        </h1>
        <p className="font-display italic text-lg text-j-text-muted mt-4 max-w-md mx-auto">
          {subheading}
        </p>

        {children}
      </main>

      <Footer />
    </div>
  );
}
