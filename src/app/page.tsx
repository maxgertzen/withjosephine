import Image from "next/image";
import { Navigation } from "@/components/Navigation";
import { Hero } from "@/components/Hero";
import { SectionHeading } from "@/components/SectionHeading";
import { ReadingCard } from "@/components/ReadingCard";
import { HowItWorks } from "@/components/HowItWorks";
import { TestimonialCard } from "@/components/TestimonialCard";
import { ContactForm } from "@/components/ContactForm";
import { GoldDivider } from "@/components/GoldDivider";
import { Footer } from "@/components/Footer";
import { READINGS, TESTIMONIALS } from "@/data/readings";

const ABOUT_IMAGE =
  "https://images.unsplash.com/photo-1506126613408-eca07ce68773?w=520&q=80";

export default function LandingPage() {
  return (
    <>
      <Navigation />
      <Hero />

      <section id="readings" className="py-24 px-6">
        <SectionHeading
          tag="✦ Offerings"
          heading="readings"
          subheading="Each reading is created with care, entirely for you. Nothing is templated or generic."
        />
        <ul className="mt-14 max-w-[900px] mx-auto flex flex-col gap-10">
          {READINGS.map((reading) => (
            <li key={reading.id}>
              <ReadingCard
                tag={reading.tag}
                name={reading.name}
                price={reading.price}
                valueProposition={reading.valueProposition}
                briefDescription={reading.briefDescription}
                expandedDetails={reading.expandedDetails}
                href={`/book/${reading.id}`}
              />
            </li>
          ))}
        </ul>
      </section>

      <GoldDivider className="max-w-xs mx-auto" />

      <section id="about" className="py-24 px-6">
        <SectionHeading
          tag="✦ About"
          heading="who i am + what this is"
        />
        <div className="mt-14 max-w-4xl mx-auto grid grid-cols-1 md:grid-cols-[260px_1fr] gap-12 items-start">
          <Image
            src={ABOUT_IMAGE}
            alt="Josephine in a meditative setting"
            width={260}
            height={380}
            loading="lazy"
            className="rounded-[20px] object-cover w-full md:w-[260px] h-[380px] shadow-j-soft"
          />
          <div className="flex flex-col gap-5">
            <p className="font-body text-base text-j-text leading-relaxed">
              I found this work the way most people find what they&rsquo;re meant to do &mdash; by
              accident, through a door I didn&rsquo;t know was there. What started as curiosity
              became a practice, and the practice became my life&rsquo;s work.
            </p>
            <p className="font-body text-base text-j-text leading-relaxed">
              Astrology gave me a map. Your birth chart is a snapshot of the sky at the exact moment
              you arrived &mdash; it shows your gifts, your wounds, your timing, and the themes that
              keep showing up in your life.
            </p>
            <p className="font-body text-base text-j-text leading-relaxed">
              The Akashic Records gave me access to the deeper layer &mdash; your soul across time.
              Past lives, ancestral patterns, the &ldquo;why&rdquo; behind the &ldquo;what.&rdquo;
              Together, they&rsquo;re the most powerful combination I&rsquo;ve found.
            </p>
            <p className="font-display text-lg italic text-j-text-heading mt-2">
              With love, Josephine
            </p>
          </div>
        </div>
      </section>

      <GoldDivider className="max-w-xs mx-auto" />

      <HowItWorks />

      <GoldDivider className="max-w-xs mx-auto" />

      <section className="py-24 px-6">
        <SectionHeading
          tag="✦ Kind Words"
          heading="what others have said"
        />
        <div className="mt-14 max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-8">
          {TESTIMONIALS.map((testimonial) => (
            <TestimonialCard
              key={testimonial.id}
              quote={testimonial.quote}
              name={testimonial.name}
              detail={testimonial.detail}
            />
          ))}
        </div>
      </section>

      <GoldDivider className="max-w-xs mx-auto" />

      <ContactForm />

      <Footer />
    </>
  );
}
