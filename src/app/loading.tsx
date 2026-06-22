import { CelestialOrb } from "@/components/CelestialOrb";
import { StarField } from "@/components/StarField";
import { PAGE_ORBS } from "@/lib/celestialPresets";

export default function Loading() {
  return (
    <div className="relative min-h-screen bg-j-cream overflow-hidden">
      <StarField count={30} className="opacity-[0.03]" />
      {PAGE_ORBS.map((orb, index) => (
        <CelestialOrb key={index} {...orb} />
      ))}
      <main
        role="status"
        aria-live="polite"
        aria-label="Loading"
        className="relative z-10 flex min-h-screen flex-col items-center justify-center px-6 text-center"
      >
        <p className="font-display italic text-[clamp(1.5rem,3.5vw,2rem)] font-medium text-j-text-heading leading-tight">
          One moment.
        </p>
        <p className="font-display italic text-base text-j-text-muted mt-4">✦</p>
      </main>
    </div>
  );
}
