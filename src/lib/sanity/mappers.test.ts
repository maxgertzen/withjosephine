import { describe, expect, it } from "vitest";

import {
  mapAbout,
  mapFaqItems,
  mapFooterContent,
  mapNavContent,
  mapReadings,
  mapSocialLinks,
  mapTestimonials,
} from "./mappers";
import type {
  SanityFaqItem,
  SanityLandingPage,
  SanityReading,
  SanitySiteSettings,
  SanityTestimonial,
} from "./types";

const SANITY_READING: SanityReading = {
  _id: "reading-soul-blueprint",
  name: "The Soul Blueprint",
  slug: "soul-blueprint",
  tag: "Signature",
  subtitle: "Soul Blueprint Reading",
  price: 17900,
  priceDisplay: "$179",
  valueProposition: "The most complete picture of your soul I can give you",
  briefDescription: "My signature offering combining your birth chart...",
  expandedDetails: ["Detail one", "Detail two"],
  includes: ["Item one", "Item two"],
  bookingSummary: "My most comprehensive reading.",
  requiresBirthChart: true,
  requiresAkashic: true,
  requiresQuestions: true,
};

const SANITY_TESTIMONIAL: SanityTestimonial = {
  _id: "testimonial-1",
  quote: "This reading changed my life.",
  name: "Jane D.",
  detail: "Soul Blueprint Reading",
  order: 0,
};

const SANITY_LANDING_PAGE: SanityLandingPage = {
  hero: {
    tagline: "Astrologer + Reader",
    introGreeting: "Hi, I'm Josephine.",
    introBody: "Intro text here.",
    ctaText: "Explore",
  },
  about: {
    sectionTag: "✦ My Story",
    heading: "about josephine",
    imageUrl: "https://cdn.sanity.io/images/test/about.png",
    paragraphs: ["Paragraph from Sanity.", "Second paragraph from Sanity."],
    signoff: "Jo",
  },
  howItWorks: {
    sectionTag: "✦ Process",
    heading: "how it works",
    steps: [{ title: "Step 1", description: "Do this" }],
  },
  readingsSection: {
    sectionTag: "✦ Services",
    heading: "our readings",
    subheading: "Custom subheading",
  },
  testimonialsSection: {
    sectionTag: "✦ Reviews",
    heading: "client feedback",
  },
  contactSection: {
    sectionTag: "✦ Contact",
    heading: "get in touch",
    description: "We'd love to hear from you.",
    submitText: "Send",
  },
};

const SANITY_SITE_SETTINGS: SanitySiteSettings = {
  brandName: "Josephine Readings",
  logoUrl: "https://cdn.sanity.io/images/test/logo.png",
  faviconUrl: "https://cdn.sanity.io/images/test/favicon.png",
  navLinks: [
    { label: "Services", sectionId: "readings" },
    { label: "About Me", sectionId: "about" },
  ],
  navCtaText: "Book Now",
  socialLinks: [{ platform: "tiktok", url: "https://tiktok.com/@test", label: "TikTok" }],
  copyrightText: "Josephine Readings Ltd.",
  contactEmail: "jo@example.com",
};

describe("mapReadings", () => {
  it("returns hardcoded readings when Sanity array is empty", () => {
    const result = mapReadings([]);

    expect(result).toHaveLength(3);
    expect(result[0].id).toBe("soul-blueprint");
    expect(result[0].name).toBe("The Soul Blueprint");
    expect(result[0].price).toBe("$179");
  });

  it("maps Sanity readings using slug as id and priceDisplay as price", () => {
    const result = mapReadings([SANITY_READING]);

    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("soul-blueprint");
    expect(result[0].price).toBe("$179");
    expect(result[0].tag).toBe("Signature");
    expect(result[0].expandedDetails).toEqual(["Detail one", "Detail two"]);
  });

  it("maps multiple Sanity readings preserving order", () => {
    const second: SanityReading = {
      ...SANITY_READING,
      _id: "reading-birth-chart",
      name: "Birth Chart",
      slug: "birth-chart",
      priceDisplay: "$99",
      price: 9900,
    };

    const result = mapReadings([SANITY_READING, second]);

    expect(result).toHaveLength(2);
    expect(result[0].id).toBe("soul-blueprint");
    expect(result[1].id).toBe("birth-chart");
    expect(result[1].price).toBe("$99");
  });

  it("reflects Sanity content changes", () => {
    const updated: SanityReading = {
      ...SANITY_READING,
      name: "Updated Soul Blueprint",
      priceDisplay: "$199",
      valueProposition: "New value prop from CMS",
    };

    const result = mapReadings([updated]);

    expect(result[0].name).toBe("Updated Soul Blueprint");
    expect(result[0].price).toBe("$199");
    expect(result[0].valueProposition).toBe("New value prop from CMS");
  });
});

describe("mapTestimonials", () => {
  it("returns hardcoded testimonials when Sanity array is empty", () => {
    const result = mapTestimonials([]);

    expect(result).toHaveLength(3);
    expect(result[0].name).toBe("Amelia R.");
  });

  it("maps Sanity testimonials using _id as id", () => {
    const result = mapTestimonials([SANITY_TESTIMONIAL]);

    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("testimonial-1");
    expect(result[0].quote).toBe("This reading changed my life.");
    expect(result[0].name).toBe("Jane D.");
    expect(result[0].detail).toBe("Soul Blueprint Reading");
  });

  it("reflects Sanity content changes", () => {
    const updated: SanityTestimonial = {
      ...SANITY_TESTIMONIAL,
      quote: "Completely new testimonial text from CMS",
      name: "New Person",
    };

    const result = mapTestimonials([updated]);

    expect(result[0].quote).toBe("Completely new testimonial text from CMS");
    expect(result[0].name).toBe("New Person");
  });

  it("supports adding testimonials beyond the hardcoded set", () => {
    const testimonials: SanityTestimonial[] = Array.from({ length: 5 }, (_, i) => ({
      _id: `testimonial-${i + 1}`,
      quote: `Quote ${i + 1}`,
      name: `Person ${i + 1}`,
      detail: `Reading ${i + 1}`,
      order: i,
    }));

    const result = mapTestimonials(testimonials);

    expect(result).toHaveLength(5);
    expect(result[4].id).toBe("testimonial-5");
    expect(result[4].quote).toBe("Quote 5");
    expect(result[4].name).toBe("Person 5");
  });
});

describe("mapAbout", () => {
  it("returns defaults when landingPage is null", () => {
    const result = mapAbout(null);

    expect(result.imageUrl).toBe("/images/akasha.webp");
    expect(result.signoff).toBe("Josephine");
    expect(result.paragraphs).toHaveLength(4);
  });

  it("maps Sanity about section data", () => {
    const result = mapAbout(SANITY_LANDING_PAGE);

    expect(result.sectionTag).toBe("\u2726 My Story");
    expect(result.heading).toBe("about josephine");
    expect(result.imageUrl).toBe("https://cdn.sanity.io/images/test/about.png");
    expect(result.paragraphs).toEqual(["Paragraph from Sanity.", "Second paragraph from Sanity."]);
    expect(result.signoff).toBe("Jo");
  });

  it("reflects content changes from CMS", () => {
    const updated: SanityLandingPage = {
      ...SANITY_LANDING_PAGE,
      about: {
        ...SANITY_LANDING_PAGE.about,
        heading: "new heading from cms",
        paragraphs: ["Only one paragraph now."],
        signoff: "Josie",
      },
    };

    const result = mapAbout(updated);

    expect(result.heading).toBe("new heading from cms");
    expect(result.paragraphs).toEqual(["Only one paragraph now."]);
    expect(result.signoff).toBe("Josie");
  });
});

describe("mapNavContent", () => {
  it("returns undefined when siteSettings is null", () => {
    expect(mapNavContent(null)).toBeUndefined();
  });

  it("maps Sanity site settings to nav content", () => {
    const result = mapNavContent(SANITY_SITE_SETTINGS);

    expect(result).toEqual({
      brandName: "Josephine Readings",
      navLinks: [
        { label: "Services", sectionId: "readings" },
        { label: "About Me", sectionId: "about" },
      ],
      navCtaText: "Book Now",
    });
  });

  it("reflects nav changes from CMS", () => {
    const updated: SanitySiteSettings = {
      ...SANITY_SITE_SETTINGS,
      brandName: "New Brand",
      navCtaText: "Start Here",
      navLinks: [{ label: "Home", sectionId: "home" }],
    };

    const result = mapNavContent(updated);

    expect(result?.brandName).toBe("New Brand");
    expect(result?.navCtaText).toBe("Start Here");
    expect(result?.navLinks).toHaveLength(1);
  });
});

describe("mapFooterContent", () => {
  it("returns undefined when siteSettings is null", () => {
    expect(mapFooterContent(null)).toBeUndefined();
  });

  it("maps Sanity site settings to footer content", () => {
    const result = mapFooterContent(SANITY_SITE_SETTINGS);

    expect(result).toEqual({
      brandName: "Josephine Readings",
      logoUrl: "https://cdn.sanity.io/images/test/logo.png",
      copyrightText: "Josephine Readings Ltd.",
    });
  });

  it("falls back to default logo when logoUrl is empty", () => {
    const noLogo: SanitySiteSettings = {
      ...SANITY_SITE_SETTINGS,
      logoUrl: "",
    };

    const result = mapFooterContent(noLogo);

    expect(result?.logoUrl).toBe("/images/logo-default.png");
  });

  it("reflects footer changes from CMS", () => {
    const updated: SanitySiteSettings = {
      ...SANITY_SITE_SETTINGS,
      copyrightText: "Updated Copyright 2026",
    };

    const result = mapFooterContent(updated);

    expect(result?.copyrightText).toBe("Updated Copyright 2026");
  });
});

const SANITY_FAQ_ITEM: SanityFaqItem = {
  _id: "faq-1",
  question: "How long does a reading take?",
  answer: "You'll receive your reading within 7 business days.",
  order: 0,
};

describe("mapFaqItems", () => {
  it("returns empty array when Sanity returns no items", () => {
    const result = mapFaqItems([]);

    expect(result).toEqual([]);
  });

  it("maps Sanity FAQ items using _id as id", () => {
    const result = mapFaqItems([SANITY_FAQ_ITEM]);

    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("faq-1");
    expect(result[0].question).toBe("How long does a reading take?");
    expect(result[0].answer).toBe("You'll receive your reading within 7 business days.");
  });

  it("supports adding multiple FAQ items", () => {
    const items: SanityFaqItem[] = Array.from({ length: 5 }, (_, i) => ({
      _id: `faq-${i + 1}`,
      question: `Question ${i + 1}`,
      answer: `Answer ${i + 1}`,
      order: i,
    }));

    const result = mapFaqItems(items);

    expect(result).toHaveLength(5);
    expect(result[4].id).toBe("faq-5");
    expect(result[4].question).toBe("Question 5");
  });

  it("reflects FAQ content changes from CMS", () => {
    const updated: SanityFaqItem = {
      ...SANITY_FAQ_ITEM,
      question: "Updated question from CMS",
      answer: "Updated answer from CMS",
    };

    const result = mapFaqItems([updated]);

    expect(result[0].question).toBe("Updated question from CMS");
    expect(result[0].answer).toBe("Updated answer from CMS");
  });
});

describe("mapSocialLinks", () => {
  it("returns empty array when siteSettings is null", () => {
    expect(mapSocialLinks(null)).toEqual([]);
  });

  it("returns empty array when socialLinks is empty", () => {
    const settings: SanitySiteSettings = {
      ...SANITY_SITE_SETTINGS,
      socialLinks: [],
    };

    expect(mapSocialLinks(settings)).toEqual([]);
  });

  it("maps Sanity social links", () => {
    const result = mapSocialLinks(SANITY_SITE_SETTINGS);

    expect(result).toHaveLength(1);
    expect(result[0]).toEqual({
      platform: "tiktok",
      url: "https://tiktok.com/@test",
      label: "TikTok",
    });
  });

  it("supports adding multiple social links", () => {
    const settings: SanitySiteSettings = {
      ...SANITY_SITE_SETTINGS,
      socialLinks: [
        { platform: "tiktok", url: "https://tiktok.com/@test", label: "TikTok" },
        { platform: "instagram", url: "https://instagram.com/test", label: "Instagram" },
        { platform: "email", url: "mailto:jo@example.com", label: "Email" },
      ],
    };

    const result = mapSocialLinks(settings);

    expect(result).toHaveLength(3);
    expect(result[1].platform).toBe("instagram");
    expect(result[2].platform).toBe("email");
  });
});
