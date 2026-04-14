"use client";

import Image from "next/image";
import { motion } from "motion/react";
import { Button } from "@/components/Button";
import { StarField } from "@/components/StarField";
import { CelestialOrb } from "@/components/CelestialOrb";
import { mergeClasses } from "@/lib/utils";

interface HeroProps {
  className?: string;
}

function MoonCrescent({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 40 40"
      fill="none"
      aria-hidden="true"
      className={className}
    >
      <path
        d="M28 4a18 18 0 1 0 0 32A22 22 0 0 1 28 4Z"
        fill="currentColor"
      />
    </svg>
  );
}

export function Hero({ className }: HeroProps) {
  const handleScrollToReadings = () => {
    document.getElementById("readings")?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <section
      className={mergeClasses(
        "relative flex min-h-svh flex-col items-center justify-center overflow-hidden bg-j-midnight",
        className
      )}
    >
      <Image
        src="/images/hero-bg.jpg"
        alt=""
        fill
        priority
        className="object-cover opacity-30 mix-blend-soft-light"
        sizes="100vw"
      />

      <StarField className="z-[1]" />

      <CelestialOrb
        color="radial-gradient(circle, var(--color-j-gold) 0%, transparent 70%)"
        size={400}
        top="-5%"
        right="-5%"
        opacity={0.15}
      />
      <CelestialOrb
        color="radial-gradient(circle, var(--color-j-rose) 0%, var(--color-j-blush) 40%, transparent 70%)"
        size={300}
        bottom="5%"
        left="-3%"
        opacity={0.12}
      />
      <CelestialOrb
        color="radial-gradient(circle, var(--color-j-deep) 0%, var(--color-j-gold) 60%, transparent 70%)"
        size={250}
        top="40%"
        left="45%"
        opacity={0.1}
      />

      <MoonCrescent className="absolute top-[12%] right-[8%] z-[1] w-10 text-j-gold/20" />
      <MoonCrescent className="absolute bottom-[18%] left-[6%] z-[1] w-7 rotate-180 text-j-gold/15" />

      <div className="relative z-10 flex flex-col items-center gap-8 px-6 py-24">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 1.2, ease: "easeOut" }}
        >
          <Image
            src="/images/Logo.png"
            alt="Josephine Soul Readings"
            width={400}
            height={400}
            priority
            className="h-auto w-[clamp(220px,50vw,400px)]"
          />
        </motion.div>

        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.9, delay: 0.6, ease: "easeOut" }}
          className="max-w-md text-center font-display text-lg tracking-wide text-j-cream/70 sm:text-xl"
        >
          Your soul has patterns. Your chart reveals them.
          <br />
          Your records explain why.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 1.0, ease: "easeOut" }}
        >
          <Button size="lg" onClick={handleScrollToReadings}>
            Explore Readings
          </Button>
        </motion.div>
      </div>
    </section>
  );
}
