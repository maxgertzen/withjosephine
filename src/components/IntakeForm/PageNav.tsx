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
  discardDraftButton?: React.ReactNode;
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
  discardDraftButton,
}: PageNavProps) {
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

      <div className="flex justify-end">
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
      </div>

      <div
        aria-live="polite"
        className="md:col-span-3 flex flex-wrap justify-center items-center gap-x-3 gap-y-1 min-h-6 text-xs text-j-text-muted font-body"
      >
        {savedIndicator}
        {discardDraftButton}
      </div>
    </nav>
  );
}
