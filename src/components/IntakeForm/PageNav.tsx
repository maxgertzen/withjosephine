import Link from "next/link";

import { Button } from "@/components/Button";

type PageNavProps = {
  isFirstPage: boolean;
  isFinalPage: boolean;
  backHref: string;
  onBack?: () => void;
  onSaveLater?: () => void;
  onNext?: () => void;
  onSubmitIntent?: () => void;
  isSubmitting?: boolean;
  nextDisabled?: boolean;
  submitDisabled?: boolean;
  submitLabel?: string;
  nextLabel?: string;
  saveLaterLabel?: string;
  savedIndicator?: React.ReactNode;
  disabledHint?: string | null;
};

export function PageNav({
  isFirstPage,
  isFinalPage,
  backHref,
  onBack,
  onSaveLater,
  onNext,
  onSubmitIntent,
  isSubmitting = false,
  nextDisabled = false,
  submitDisabled = false,
  submitLabel = "Continue to payment →",
  nextLabel = "Next →",
  saveLaterLabel = "Save and continue later",
  savedIndicator,
  disabledHint = null,
}: PageNavProps) {
  const showHint =
    disabledHint !== null && (isFinalPage ? submitDisabled && !isSubmitting : nextDisabled);
  return (
    <nav
      aria-label="Form navigation"
      className="grid grid-cols-1 md:grid-cols-3 gap-4 items-center mt-10"
    >
      <div className="flex justify-start">
        {isFirstPage ? (
          <Link
            href={backHref}
            className="font-body text-sm text-j-text-muted hover:text-j-text-heading transition-colors inline-flex items-center min-h-11 px-2"
          >
            ← Back to reading details
          </Link>
        ) : (
          <button
            type="button"
            onClick={onBack}
            className="font-body text-sm text-j-text-muted hover:text-j-text-heading transition-colors inline-flex items-center min-h-11 px-2 cursor-pointer"
          >
            ← Previous page
          </button>
        )}
      </div>

      <div className="flex justify-center">
        <button
          type="button"
          onClick={onSaveLater}
          className="font-display italic text-sm text-j-text-muted hover:text-j-text transition-colors inline-flex items-center min-h-11 px-2 cursor-pointer"
        >
          {saveLaterLabel}
        </button>
      </div>

      <div className="flex flex-col items-end gap-2">
        {isFinalPage ? (
          <Button
            type="submit"
            size="lg"
            className="min-h-14 !font-display !italic !normal-case !tracking-normal !text-base !font-medium"
            disabled={submitDisabled || isSubmitting}
            onClick={() => onSubmitIntent?.()}
          >
            {isSubmitting ? "Submitting…" : submitLabel}
          </Button>
        ) : (
          <Button
            type="button"
            size="default"
            onClick={onNext}
            disabled={nextDisabled}
            className="min-h-11"
          >
            {nextLabel}
          </Button>
        )}
        {showHint ? (
          <p
            role="status"
            aria-live="polite"
            className="font-body text-xs italic text-j-text-muted text-right max-w-xs"
          >
            {disabledHint}
          </p>
        ) : null}
      </div>

      <div
        aria-live="polite"
        className="md:col-span-3 flex justify-center min-h-6 text-xs text-j-text-muted font-body"
      >
        {savedIndicator}
      </div>
    </nav>
  );
}
