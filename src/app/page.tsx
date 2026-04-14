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
  "https://images.unsplash.com/photo-1577344718665-3e7c0c1ecf6b?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=520&q=80";

export default function LandingPage() {
  return (
    <>
      <Navigation />
      <Hero />

      <section id="about" className="relative overflow-hidden py-24 px-6">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -top-20 -right-20 h-[350px] w-[350px] rounded-full border border-j-accent/[0.12]"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -top-[50px] -right-[50px] h-[280px] w-[280px] rounded-full border border-j-accent/[0.08]"
        />

        <SectionHeading
          tag="✦ About"
          heading="who i am + what this is"
        />
        <div className="mt-14 max-w-[1100px] mx-auto grid grid-cols-1 md:grid-cols-[260px_1fr] gap-16 items-start">
          <Image
            src={ABOUT_IMAGE}
            alt="Meditation and spiritual energy"
            width={260}
            height={380}
            loading="lazy"
            className="rounded-lg object-cover w-full md:w-[260px] h-[380px] opacity-[0.85] border border-j-accent/20"
          />
          <div className="flex flex-col gap-5">
            <p className="font-body text-base text-j-text leading-[1.9] font-light">
              I found this work through my own search for purpose. Wanting to understand myself
              more deeply, why I was the way I was, what I was here for, why certain patterns
              kept showing up &mdash; this led me to astrology and then to the Akashic Records.
            </p>
            <p className="font-body text-base text-j-text-muted leading-[1.9] font-light">
              These two things together changed everything for me. And now I use them as a bridge
              for others. Astrology maps your soul&rsquo;s blueprint through your birth chart.
              Your gifts, your wounds, your patterns and your path.
            </p>
            <p className="font-body text-base text-j-text-muted leading-[1.9] font-light">
              The Akashic Records go even deeper. They&rsquo;re a spiritual record of your soul
              across time. Every experience, every contract, every lesson your soul has carried
              into this lifetime.
            </p>
            <p className="font-body text-base text-j-text-muted leading-[1.9] font-light">
              Together they create a level of understanding that&rsquo;s hard to describe until
              you&rsquo;ve experienced it.
            </p>
            <div className="mt-4">
              <p className="font-display text-lg italic text-j-text-muted">
                With love,
              </p>
              <p className="font-display text-2xl italic text-j-deep tracking-wide">
                Josephine
              </p>
            </div>
          </div>
        </div>
      </section>

      <GoldDivider className="max-w-xs mx-auto" />

      <HowItWorks />

      <GoldDivider className="max-w-xs mx-auto" />

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
