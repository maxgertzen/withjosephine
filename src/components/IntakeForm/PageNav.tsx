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
  saveLaterDisabled?: boolean;
  submitLabel?: string;
  nextLabel?: string;
  saveLaterLabel?: string;
  savedIndicator?: React.ReactNode;
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
  saveLaterDisabled = false,
  submitLabel = "Continue to payment →",
  nextLabel = "Next →",
  saveLaterLabel = "Save and continue later",
  savedIndicator,
}: PageNavProps) {
  return (
    <nav
      aria-label="Form navigation"
      className="grid grid-cols-1 md:grid-cols-3 gap-3 items-center mt-10"
    >
      <div className="flex justify-center md:justify-start order-3 md:order-1">
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
            className="font-body text-sm text-j-text-muted hover:text-j-text-heading transition-colors inline-flex items-center min-h-11 px-2"
          >
            ← Previous page
          </button>
        )}
      </div>

      <div className="flex justify-center order-2">
        <button
          type="button"
          onClick={onSaveLater}
          disabled={saveLaterDisabled}
          className="font-display italic text-sm text-j-text-muted hover:text-j-text transition-colors inline-flex items-center min-h-11 px-2 disabled:opacity-50 disabled:hover:text-j-text-muted"
        >
          {saveLaterLabel}
        </button>
      </div>

      <div className="flex justify-center md:justify-end order-1 md:order-3">
        {isFinalPage ? (
          <Button
            type="submit"
            size="lg"
            data-testid="intake-submit"
            className="w-full md:w-auto min-h-14 whitespace-nowrap !font-display !italic !normal-case !tracking-normal !text-base !font-medium aria-disabled:opacity-50"
            disabled={isSubmitting}
            aria-disabled={submitDisabled || isSubmitting}
            onClick={() => onSubmitIntent?.()}
          >
            {isSubmitting ? "Submitting…" : submitLabel}
          </Button>
        ) : (
          <Button
            type="button"
            size="default"
            data-testid="intake-next"
            onClick={onNext}
            aria-disabled={nextDisabled}
            className="w-full md:w-auto min-h-11 whitespace-nowrap aria-disabled:opacity-50"
          >
            {nextLabel}
          </Button>
        )}
      </div>

      <div
        aria-live="polite"
        className="md:col-span-3 flex justify-center min-h-6 text-xs text-j-text-muted font-body order-4"
      >
        {savedIndicator}
      </div>
    </nav>
  );
}
