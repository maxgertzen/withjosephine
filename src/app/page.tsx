import type { Metadata } from "next";
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
import {
  fetchLandingPage,
  fetchReadings,
  fetchTestimonials,
  fetchSiteSettings,
} from "@/lib/sanity/fetch";

export async function generateMetadata(): Promise<Metadata> {
  const landingPage = await fetchLandingPage();
  const seo = landingPage?.seo;

  return {
    title: seo?.metaTitle ?? "Josephine — Soul Readings",
    description:
      seo?.metaDescription ??
      "Your soul has patterns. Your chart reveals them. Your records explain why.",
    icons: {
      icon: "/favicon.ico",
      apple: "/apple-touch-icon.png",
    },
  };
}

export default async function LandingPage() {
  const [landingPage, sanityReadings, sanityTestimonials, siteSettings] =
    await Promise.all([
      fetchLandingPage(),
      fetchReadings(),
      fetchTestimonials(),
      fetchSiteSettings(),
    ]);

  const readings =
    sanityReadings.length > 0
      ? sanityReadings.map((r) => ({
          id: r.slug,
          tag: r.tag,
          name: r.name,
          price: r.priceDisplay,
          valueProposition: r.valueProposition,
          briefDescription: r.briefDescription,
          expandedDetails: r.expandedDetails,
        }))
      : READINGS;

  const testimonials =
    sanityTestimonials.length > 0
      ? sanityTestimonials.map((t) => ({
          id: t._id,
          quote: t.quote,
          name: t.name,
          detail: t.detail,
        }))
      : TESTIMONIALS;

  const about = landingPage?.about;
  const aboutImage = about?.imageUrl ?? "/images/akasha.png";
  const aboutParagraphs = about?.paragraphs ?? [
    "I found this work through my own search for purpose. Wanting to understand myself more deeply, why I was the way I was, what I was here for, why certain patterns kept showing up \u2014 this led me to astrology and then to the Akashic Records.",
    "These two things together changed everything for me. And now I use them as a bridge for others. Astrology maps your soul\u2019s blueprint through your birth chart. Your gifts, your wounds, your patterns and your path.",
    "The Akashic Records go even deeper. They\u2019re a spiritual record of your soul across time. Every experience, every contract, every lesson your soul has carried into this lifetime.",
    "Together they create a level of understanding that\u2019s hard to describe until you\u2019ve experienced it.",
  ];
  const aboutSignoff = about?.signoff ?? "Josephine";

  const readingsSection = landingPage?.readingsSection;
  const testimonialsSection = landingPage?.testimonialsSection;

  const navContent = siteSettings
    ? {
        brandName: siteSettings.brandName,
        navLinks: siteSettings.navLinks,
        navCtaText: siteSettings.navCtaText,
      }
    : undefined;

  const footerContent = siteSettings
    ? {
        brandName: siteSettings.brandName,
        logoUrl: siteSettings.logoUrl || "/images/logo-default.png",
        copyrightText: siteSettings.copyrightText,
      }
    : undefined;

  return (
    <>
      <Navigation content={navContent} />
      <Hero content={landingPage?.hero ?? undefined} />

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
          tag={about?.sectionTag ?? "\u2726 About"}
          heading={about?.heading ?? "who i am + what this is"}
        />
        <div className="mt-14 max-w-[1100px] mx-auto grid grid-cols-1 md:grid-cols-[300px_1fr] gap-16 items-start">
          <Image
            src={aboutImage}
            alt="Josephine"
            width={300}
            height={450}
            loading="lazy"
            className="w-full md:w-[300px] h-auto object-contain"
          />
          <div className="flex flex-col gap-5">
            {aboutParagraphs.map((paragraph, index) => (
              <p
                key={index}
                className={`font-body text-base leading-[1.9] font-light ${
                  index === 0 ? "text-j-text" : "text-j-text-muted"
                }`}
              >
                {paragraph}
              </p>
            ))}
            <div className="mt-4">
              <p className="font-display text-lg italic text-j-text-muted">
                With love,
              </p>
              <p className="font-display text-2xl italic text-j-deep tracking-wide">
                {aboutSignoff}
              </p>
            </div>
          </div>
        </div>
      </section>

      <GoldDivider className="max-w-xs mx-auto" />

      <HowItWorks content={landingPage?.howItWorks ?? undefined} />

      <GoldDivider className="max-w-xs mx-auto" />

      <section id="readings" className="py-24 px-6">
        <SectionHeading
          tag={readingsSection?.sectionTag ?? "\u2726 Offerings"}
          heading={readingsSection?.heading ?? "readings"}
          subheading={
            readingsSection?.subheading ??
            "Each reading is created with care, entirely for you. Nothing is templated or generic."
          }
        />
        <ul className="mt-14 max-w-[900px] mx-auto flex flex-col gap-10">
          {readings.map((reading) => (
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
          tag={testimonialsSection?.sectionTag ?? "\u2726 Kind Words"}
          heading={testimonialsSection?.heading ?? "what others have said"}
        />
        <div className="mt-14 max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-8">
          {testimonials.map((testimonial) => (
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

      <ContactForm content={landingPage?.contactSection ?? undefined} />

      <Footer content={footerContent} />
    </>
  );
}
