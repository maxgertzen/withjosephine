type PageIndicatorProps = {
  pageNumber: number;
  totalPages: number;
  tagline?: string;
  text?: string;
  className?: string;
};

export function PageIndicator({
  pageNumber,
  totalPages,
  tagline,
  text,
  className,
}: PageIndicatorProps) {
  const body = text ?? defaultText(pageNumber, totalPages, tagline);

  return (
    <p
      className={[
        "font-display italic text-base text-j-text-muted",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
      aria-label={`Page ${pageNumber} of ${totalPages}`}
      role="status"
      aria-live="polite"
      tabIndex={-1}
    >
      <span aria-hidden="true" className="text-j-accent mr-2">
        ✦
      </span>
      <em>{body}</em>
    </p>
  );
}

function defaultText(pageNumber: number, totalPages: number, tagline?: string): string {
  const base = totalPages > 1 ? `Page ${pageNumber} of ${totalPages}` : "One short page";
  return tagline ? `${base} · ${tagline}` : base;
}
