import type { SanityFormSection, SanityPagination } from "@/lib/sanity/types";

export type IntakePage = SanityFormSection[];

export function derivePages(
  sections: SanityFormSection[],
  options?: { readingSlug?: string; pagination?: SanityPagination },
): IntakePage[] {
  if (sections.length === 0) return [];

  const pages: IntakePage[] = [[]];
  for (const section of sections) {
    if (section.pageBoundary === true && pages[pages.length - 1].length > 0) {
      pages.push([]);
    }
    pages[pages.length - 1].push(section);
  }

  const filtered = pages.filter((page) => page.length > 0);

  const override = options?.pagination?.overrides?.find(
    (entry) => entry.readingSlug === options?.readingSlug,
  );
  const target = override?.pageCount;
  if (typeof target === "number" && target > 0 && target < filtered.length) {
    const head = filtered.slice(0, target - 1);
    const tail = filtered.slice(target - 1).flat();
    return [...head, tail];
  }

  return filtered;
}
