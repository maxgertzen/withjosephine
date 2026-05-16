"use client";

type PageValidationSummaryProps = {
  errorCount: number;
  firstFieldLabel: string | null;
  onJumpToFirstError: () => void;
};

export function PageValidationSummary({
  errorCount,
  firstFieldLabel,
  onJumpToFirstError,
}: PageValidationSummaryProps) {
  if (errorCount === 0) return null;

  const phrase =
    errorCount === 1
      ? "1 field still needs your attention"
      : `${errorCount} fields still need your attention`;

  return (
    <div
      role="alert"
      aria-live="polite"
      className="font-body text-xs italic text-j-text-muted text-center mt-4"
    >
      {phrase}
      {firstFieldLabel ? (
        <>
          :{" "}
          <button
            type="button"
            onClick={onJumpToFirstError}
            className="underline underline-offset-2 hover:text-j-text-heading transition-colors cursor-pointer"
          >
            {firstFieldLabel}
          </button>
        </>
      ) : (
        "."
      )}
    </div>
  );
}
