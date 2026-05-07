import type { SanityFormField, SanityFormSection } from "@/lib/sanity/types";

function appliesToReading(services: string[] | undefined, readingSlug: string) {
  if (!services || services.length === 0) return true;
  return services.includes(readingSlug);
}

export function filterSectionsForReading(
  sections: SanityFormSection[],
  readingSlug: string,
): SanityFormSection[] {
  return sections
    .filter((section) => appliesToReading(section.appliesToServices, readingSlug))
    .map((section) => ({
      ...section,
      fields: section.fields.filter((field) =>
        appliesToReading(field.appliesToServices, readingSlug),
      ),
    }))
    .filter((section) => section.fields.length > 0);
}

export function flattenActiveFields(
  sections: SanityFormSection[],
  readingSlug: string,
): SanityFormField[] {
  return filterSectionsForReading(sections, readingSlug).flatMap((section) => section.fields);
}
