import { groq } from "next-sanity";

export const landingPageQuery = groq`
  *[_type == "landingPage"][0] {
    hero,
    about {
      sectionTag,
      heading,
      "imageUrl": image.asset->url,
      paragraphs,
      signoff
    },
    howItWorks,
    readingsSection,
    testimonialsSection,
    contactSection,
    seo
  }
`;

export const readingsQuery = groq`
  *[_type == "reading"] | order(order asc) {
    _id,
    name,
    "slug": slug.current,
    tag,
    subtitle,
    price,
    priceDisplay,
    valueProposition,
    briefDescription,
    expandedDetails,
    includes,
    bookingSummary,
    requiresBirthChart,
    requiresAkashic,
    requiresQuestions,
    stripePaymentLink,
    seo
  }
`;

export const readingBySlugQuery = groq`
  *[_type == "reading" && slug.current == $slug][0] {
    _id,
    name,
    "slug": slug.current,
    tag,
    subtitle,
    price,
    priceDisplay,
    valueProposition,
    briefDescription,
    expandedDetails,
    includes,
    bookingSummary,
    requiresBirthChart,
    requiresAkashic,
    requiresQuestions,
    stripePaymentLink,
    seo
  }
`;

export const readingSlugsQuery = groq`
  *[_type == "reading"] { "slug": slug.current }
`;

export const testimonialsQuery = groq`
  *[_type == "testimonial"] | order(order asc) {
    _id,
    quote,
    name,
    "detail": coalesce(readingType->subtitle, detailOverride),
    order
  }
`;

export const faqItemsQuery = groq`
  *[_type == "faqItem"] | order(order asc) {
    _id,
    question,
    answer,
    order
  }
`;

export const siteSettingsQuery = groq`
  *[_type == "siteSettings"][0] {
    brandName,
    "logoUrl": logo.asset->url,
    "faviconUrl": favicon.asset->url,
    navLinks,
    navCtaText,
    socialLinks,
    copyrightText,
    contactEmail
  }
`;

export const bookingPageQuery = groq`
  *[_type == "bookingPage"][0] {
    emailLabel,
    emailDisclaimer,
    paymentButtonText,
    securityNote,
    closingMessage,
    deliveryNote,
    seo
  }
`;

export const thankYouPageQuery = groq`
  *[_type == "thankYouPage"][0] {
    heading,
    subheading,
    steps,
    closingMessage,
    returnButtonText,
    seo
  }
`;

export const themeQuery = groq`
  *[_type == "theme"][0] {
    colors,
    displayFont,
    bodyFont
  }
`;
