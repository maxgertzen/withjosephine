import { READING_PAGE_DEFAULTS } from "@/data/defaults";
import { applyTokens } from "@/lib/emails/applyTokens";

type PageIndicatorProps = {
  pageNumber: number;
  totalPages: number;
  tagline?: string;
  counterTemplate?: string;
  onePageText?: string;
};

export function PageIndicator({
  pageNumber,
  totalPages,
  tagline,
  counterTemplate = READING_PAGE_DEFAULTS.pageCounterTemplate,
  onePageText = READING_PAGE_DEFAULTS.onePageLabel,
}: PageIndicatorProps) {
  const counter = totalPages > 1 ? applyTokens(counterTemplate, { page: pageNumber, total: totalPages }) : onePageText;
  const body = tagline ? `${counter} · ${tagline}` : counter;

  return (
    <p
      className="font-display italic text-base text-j-text-muted"
      aria-label={counter}
      role="status"
      aria-live="polite"
      tabIndex={-1}
    >
      <span aria-hidden="true" className="text-j-ornament mr-2">
        ✦
      </span>
      <em>{body}</em>
    </p>
  );
}
