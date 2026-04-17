import { GoldDivider } from "@/components/GoldDivider";
import { SectionHeading } from "@/components/SectionHeading";
import { HOW_IT_WORKS_DEFAULTS, type HowItWorksContent } from "@/data/defaults";
import { mergeClasses } from "@/lib/utils";

interface HowItWorksProps {
  content?: HowItWorksContent;
  className?: string;
}

export function HowItWorks({ content, className }: HowItWorksProps) {
  const { sectionTag, heading, steps } = content ?? HOW_IT_WORKS_DEFAULTS;

  return (
    <section id="how-it-works" className={mergeClasses("py-20 px-6 md:px-12", className)}>
      <SectionHeading tag={sectionTag} heading={heading} />

      <div className="mt-14 max-w-2xl mx-auto flex flex-col">
        {steps.map((step, index) => (
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
