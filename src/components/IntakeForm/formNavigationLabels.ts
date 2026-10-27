import type { ReadingPageContent } from "@/data/defaults";

export const FORM_NAVIGATION_LABEL_KEYS = [
  "backToReadingsLabel",
  "previousPageLabel",
  "pageCounterTemplate",
  "onePageLabel",
] as const satisfies readonly (keyof ReadingPageContent)[];

export type FormNavigationLabels = Partial<Pick<ReadingPageContent, (typeof FORM_NAVIGATION_LABEL_KEYS)[number]>>;
