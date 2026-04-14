import { SectionHeading } from "@/components/SectionHeading";
import { GoldDivider } from "@/components/GoldDivider";
import { mergeClasses } from "@/lib/utils";

const STEPS = [
  {
    title: "Choose Your Reading",
    description:
      "Browse the offerings above, select the reading that calls to you, and complete your payment securely.",
  },
  {
    title: "Share Your Details",
    description:
      "After payment, I\u2019ll send you everything you need \u2014 a simple form for your birth details and a personalised question menu.",
  },
  {
    title: "Receive Your Reading",
    description:
      "Within 7 days, you\u2019ll receive a detailed voice note recording and a supporting PDF created entirely for you.",
  },
] as const;

interface HowItWorksProps {
  className?: string;
}

export function HowItWorks({ className }: HowItWorksProps) {
  return (
    <section
      id="how-it-works"
      className={mergeClasses("py-20 px-6 md:px-12", className)}
    >
      <SectionHeading tag="\u2726 Process" heading="how it works" />

      <div className="mt-14 max-w-2xl mx-auto flex flex-col">
        {STEPS.map((step, index) => (
          <div key={step.title}>
            {index > 0 && <GoldDivider className="my-10" />}
            <div className="flex gap-6 items-start">
              <span className="font-display text-[clamp(2.4rem,5vw,3.6rem)] font-light italic leading-none text-j-accent shrink-0">
                {String(index + 1).padStart(2, "0")}
              </span>
              <div>
                <h3 className="font-display text-xl italic text-j-text-heading leading-tight">
                  {step.title}
                </h3>
                <p className="font-body text-sm text-j-text-muted leading-relaxed mt-2">
                  {step.description}
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
