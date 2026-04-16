import Image from "next/image";
import { CONTACT_EMAIL } from "@/lib/constants";

export function UnderConstruction() {
  return (
    <div className="min-h-screen bg-j-cream flex flex-col items-center justify-center px-6 text-center">
      <Image
        src="/images/under-construction.png"
        alt="Mystical gathering around a pyramid of light"
        width={480}
        height={480}
        priority
        className="rounded-2xl shadow-j-soft mb-10 max-w-[min(480px,90vw)] h-auto"
      />

      <span className="text-[0.68rem] tracking-[0.22em] uppercase text-j-accent font-body block mb-4">
        ✦ Something Beautiful is Coming
      </span>

      <h1 className="font-display text-[clamp(2.5rem,6vw,4rem)] font-light italic text-j-text-heading leading-tight">
        Josephine
      </h1>

      <p className="font-display text-lg italic text-j-text-muted mt-4 max-w-md">
        Coming soon — a space for soul readings, birth charts, and Akashic records.
      </p>

      <p className="font-body text-sm text-j-text-muted mt-8">
        In the meantime, reach out at{" "}
        <a
          href={`mailto:${CONTACT_EMAIL}`}
          className="text-j-accent hover:underline transition-colors"
        >
          {CONTACT_EMAIL}
        </a>
      </p>
    </div>
  );
}
