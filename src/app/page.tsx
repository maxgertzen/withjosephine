import type { Metadata } from "next";
import { draftMode } from "next/headers";
import Image from "next/image";

import { ContactForm } from "@/components/ContactForm";
import { FaqSection } from "@/components/FaqSection";
import { Footer } from "@/components/Footer";
import { GoldDivider } from "@/components/GoldDivider";
import { Hero } from "@/components/Hero";
import { HowItWorks } from "@/components/HowItWorks";
import { Navigation } from "@/components/Navigation";
import { ReadingCard } from "@/components/ReadingCard";
import { SectionHeading } from "@/components/SectionHeading";
import { TestimonialCard } from "@/components/TestimonialCard";
import { UnderConstruction } from "@/components/UnderConstruction";
import { isUnderConstruction } from "@/lib/featureFlags";
import {
  fetchFaqItems,
  fetchLandingPage,
  fetchReadings,
  fetchSiteSettings,
  fetchTestimonials,
  fetchUnderConstructionPage,
} from "@/lib/sanity/fetch";
import {
  mapAbout,
  mapFaqItems,
  mapFooterContent,
  mapNavContent,
  mapReadings,
  mapSocialLinks,
  mapTestimonials,
} from "@/lib/sanity/mappers";
import { buildOpenGraph } from "@/lib/seoMetadata";

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
    openGraph: buildOpenGraph(seo),
  };
}

export default async function LandingPage() {
  const { isEnabled: isDraftMode } = await draftMode();

  if (isUnderConstruction() && !isDraftMode) {
    const underConstructionContent = await fetchUnderConstructionPage();
    return <UnderConstruction content={underConstructionContent} />;
  }

  const [landingPage, sanityReadings, sanityTestimonials, sanityFaqItems, siteSettings] =
    await Promise.all([
      fetchLandingPage(),
      fetchReadings(),
      fetchTestimonials(),
      fetchFaqItems(),
      fetchSiteSettings(),
    ]);

  const readings = mapReadings(sanityReadings);
  const testimonials = mapTestimonials(sanityTestimonials);
  const faqItems = mapFaqItems(sanityFaqItems);
  const about = mapAbout(landingPage);
  const navContent = mapNavContent(siteSettings);
  const footerContent = mapFooterContent(siteSettings);
  const socialLinks = mapSocialLinks(siteSettings);

  const readingsSection = landingPage?.readingsSection;
  const testimonialsSection = landingPage?.testimonialsSection;

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

        <SectionHeading tag={about.sectionTag} heading={about.heading} />
        <div className="mt-14 max-w-[1100px] mx-auto grid grid-cols-1 md:grid-cols-[300px_1fr] gap-16 items-start">
          <Image
            src={about.imageUrl}
            alt="Josephine"
            width={300}
            height={450}
            loading="lazy"
            className="w-full md:w-[300px] h-auto object-contain"
          />
          <div className="flex flex-col gap-5">
            {about.paragraphs.map((paragraph, index) => (
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
              <p className="font-display text-lg italic text-j-text-muted">With love,</p>
              <p className="font-display text-2xl italic text-j-deep tracking-wide">
                {about.signoff}
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
                slug={reading.id}
                tag={reading.tag}
                name={reading.name}
                price={reading.price}
                valueProposition={reading.valueProposition}
                briefDescription={reading.briefDescription}
                expandedDetails={reading.expandedDetails}
                href={`/book/${reading.id}/intake`}
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
        <div className="mt-14 max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-8">
          {testimonials.map((testimonial, index) => (
            <TestimonialCard
              key={testimonial.id}
              quote={testimonial.quote}
              name={testimonial.name}
              detail={testimonial.detail}
              className={index === 0 ? "md:col-span-2" : undefined}
            />
          ))}
        </div>
      </section>

      <GoldDivider className="max-w-xs mx-auto" />

      <FaqSection items={faqItems} />

      {faqItems.length > 0 && <GoldDivider className="max-w-xs mx-auto" />}

      <ContactForm content={landingPage?.contactSection ?? undefined} />

      <Footer content={footerContent} socialLinks={socialLinks} />
    </>
  );
}
