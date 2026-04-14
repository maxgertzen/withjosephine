"use client";

import Image from "next/image";
import { motion } from "motion/react";
import { Button } from "@/components/Button";
import { StarField } from "@/components/StarField";
import { CelestialOrb } from "@/components/CelestialOrb";
import { mergeClasses } from "@/lib/utils";

interface HeroContent {
  tagline: string;
  introGreeting: string;
  introBody: string;
  ctaText: string;
}

const HERO_DEFAULTS: HeroContent = {
  tagline: "Astrologer  +  Akashic Record Reader",
  introGreeting: "Hi, I\u2019m Josephine.",
  introBody:
    "I combine your birth chart and Akashic Records to help you understand your soul more deeply. Your patterns, your purpose and your path.\n\nIf you\u2019re here, you\u2019re probably ready to understand yourself on a level that changes everything. Abundance, clarity, the right relationships, a real sense of direction. It\u2019s all in there.",
  ctaText: "Explore Readings",
};

interface HeroProps {
  content?: HeroContent;
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

export function Hero({ content, className }: HeroProps) {
  const { tagline, introGreeting, introBody, ctaText } = content ?? HERO_DEFAULTS;
  const [bodyFirst, bodySecond] = introBody.split("\n\n");

  const handleScrollToReadings = () => {
    document.getElementById("readings")?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <section
      className={mergeClasses(
        "relative flex min-h-svh flex-col items-center justify-center overflow-hidden px-6 py-28",
        className
      )}
      style={{
        background: "linear-gradient(160deg, var(--color-j-bg-section) 0%, var(--color-j-bg-primary) 55%, #F2EDE3 100%)",
      }}
    >
      <StarField count={30} className="z-[1] opacity-[0.15]" />

      <CelestialOrb
        color="radial-gradient(circle, var(--color-j-accent) 0%, transparent 70%)"
        size={500}
        top="-15%"
        left="-12%"
        opacity={0.08}
        blur={100}
      />
      <CelestialOrb
        color="radial-gradient(circle, var(--color-j-blush) 0%, transparent 70%)"
        size={400}
        bottom="-10%"
        right="-10%"
        opacity={0.12}
        blur={90}
      />
      <CelestialOrb
        color="radial-gradient(circle, var(--color-j-accent) 0%, transparent 70%)"
        size={200}
        top="30%"
        right="8%"
        opacity={0.06}
        blur={60}
      />

      <MoonCrescent className="absolute bottom-[8%] right-[6%] z-[1] w-40 text-j-gold/[0.12]" />
      <MoonCrescent className="absolute top-[14%] left-[4%] z-[1] w-[90px] text-j-gold/10" />

      <div className="relative z-10 flex max-w-[720px] flex-col items-center text-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.92 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 1.2, ease: "easeOut" }}
          className="mb-6"
        >
          <Image
            src="/images/Logo.png"
            alt="Josephine Soul Readings"
            width={480}
            height={480}
            priority
            className="h-auto w-[clamp(280px,40vw,480px)]"
          />
        </motion.div>

        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.9, delay: 0.3, ease: "easeOut" }}
          className="mb-12 font-body text-[clamp(0.65rem,1.8vw,0.8rem)] font-normal uppercase tracking-[0.26em] text-j-accent"
        >
          {tagline}
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.9, delay: 0.75, ease: "easeOut" }}
          className="mb-12"
        >
          <p className="mb-4 font-display text-[clamp(1.15rem,2.4vw,1.4rem)] font-light italic leading-[1.75] text-j-text">
            {introGreeting}
          </p>
          <p className="mb-3 font-body text-[clamp(0.85rem,1.7vw,0.97rem)] font-light leading-[1.85] text-j-text-muted">
            {bodyFirst}
          </p>
          {bodySecond && (
            <p className="font-body text-[clamp(0.85rem,1.7vw,0.97rem)] font-light leading-[1.85] text-j-text-muted">
              {bodySecond}
            </p>
          )}
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 1.0, ease: "easeOut" }}
        >
          <Button size="lg" onClick={handleScrollToReadings}>
            {ctaText}
          </Button>
        </motion.div>
      </div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.8 }}
        onClick={handleScrollToReadings}
        className="absolute bottom-6 left-1/2 z-10 -translate-x-1/2 cursor-pointer"
      >
        <div
          className="h-[50px] w-px"
          style={{
            background: "linear-gradient(to bottom, transparent, rgba(var(--j-accent-rgb), 0.5) 50%, transparent)",
          }}
        />
      </motion.div>
    </section>
  );
}
