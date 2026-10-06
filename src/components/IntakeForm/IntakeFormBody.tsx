"use client";

import type {
  Dispatch,
  FormEvent,
  KeyboardEvent,
  ReactNode,
  RefObject,
  SetStateAction,
} from "react";

import { GiftCodeField, type GiftCodeFieldProps } from "@/components/GiftCodeField";
import { HoneypotField } from "@/components/HoneypotField";
import { InvisibleTurnstile } from "@/components/InvisibleTurnstile";
import type { IntakePage } from "@/lib/booking/derivePages";
import { CLARITY_MASK_PROPS } from "@/lib/clarity";
import type { LegalConsentSnapshot } from "@/lib/compliance/intakeConsent";
import { errorClasses } from "@/lib/formStyles";
import { homeReadingAnchor } from "@/lib/http/routes";
import type { UseTurnstileChallengeResult } from "@/lib/intake/useTurnstileChallenge";
import type { SanityFormSection } from "@/lib/sanity/types";

import { DiscardDraftButton } from "./DiscardDraftButton";
import { type GiftFinalPageCopy, GiftFinalPageLines } from "./GiftFinalPageLines";
import { LegalAcknowledgments, type LegalAcknowledgmentsErrors } from "./LegalAcknowledgments";
import { PageIndicator } from "./PageIndicator";
import { PageNav } from "./PageNav";
import { PageValidationSummary } from "./PageValidationSummary";
import { RenderedSection } from "./RenderedSection";
import type { RenderContext } from "./renderField";
import { ReviewSummary } from "./ReviewSummary";
import { SubmitOverlay } from "./SubmitOverlay";
import { type FormTestimonial, TestimonialLine } from "./TestimonialLine";
import type { FieldValues } from "./types";

export type IntakeFormBodyProps = {
  formRef: RefObject<HTMLFormElement | null>;
  submitIntentRef: RefObject<boolean>;
  handleSubmit: (event: FormEvent<HTMLFormElement>) => Promise<void> | void;

  readingId: string;
  readingName: string;
  loadingStateCopy?: string;
  pageIndicatorTagline?: string;
  testimonial?: FormTestimonial;
  submitLabel?: string;
  nextLabel?: string;
  saveLaterLabel?: string;
  nonRefundableNotice: string;

  honeypot: string;
  setHoneypot: Dispatch<SetStateAction<string>>;

  isSubmitting: boolean;
  isFinalPage: boolean;
  isFirstPage: boolean;
  currentPage: number;
  totalPages: number;
  errorCount: number;
  firstFieldLabel: string | null;
  onJumpToFirstError: () => void;
  submitDisabled: boolean;
  onAdvanceAttempt: () => void;
  valuesUntouched: boolean;
  values: FieldValues;
  pages: IntakePage[];
  currentSections: SanityFormSection[];
  pairedUnknownKeys: Set<string>;
  renderContext: RenderContext;

  lastSavedAt: Date | null;
  savedIndicator: ReactNode;

  consentSnapshot: LegalConsentSnapshot;
  setConsentSnapshot: (next: LegalConsentSnapshot) => void;
  consentErrors: LegalAcknowledgmentsErrors;
  clearConsentError: (key: keyof LegalAcknowledgmentsErrors) => void;
  showCoolingOff: boolean;

  turnstile: UseTurnstileChallengeResult;

  submitError: string | null;

  handleNext: () => void;
  handleBack: () => void;
  handleReviewEdit: (targetPageIndex: number) => void;
  handleSaveLater: () => void;
  handleDiscardDraft: () => void;

  giftFinalPage?: GiftFinalPageCopy;
  onRemoveGiftCode: () => void;
  giftCodeField?: GiftCodeFieldProps;
};

function suppressEnterInNonSubmitFields(event: KeyboardEvent<HTMLFormElement>) {
  if (event.key !== "Enter") return;
  const target = event.target as HTMLElement;
  const tag = target.tagName;
  if (tag === "TEXTAREA") return;
  if (tag === "BUTTON" && (target as HTMLButtonElement).type === "submit") return;
  event.preventDefault();
}

export function IntakeFormBody({
  formRef,
  submitIntentRef,
  handleSubmit,
  readingId,
  readingName,
  loadingStateCopy,
  pageIndicatorTagline,
  testimonial,
  submitLabel,
  nextLabel,
  saveLaterLabel,
  nonRefundableNotice,
  honeypot,
  setHoneypot,
  isSubmitting,
  isFinalPage,
  isFirstPage,
  currentPage,
  totalPages,
  errorCount,
  firstFieldLabel,
  onJumpToFirstError,
  submitDisabled,
  onAdvanceAttempt,
  valuesUntouched,
  values,
  pages,
  currentSections,
  pairedUnknownKeys,
  renderContext,
  lastSavedAt,
  savedIndicator,
  consentSnapshot,
  setConsentSnapshot,
  consentErrors,
  clearConsentError,
  showCoolingOff,
  turnstile,
  submitError,
  handleNext,
  handleBack,
  handleReviewEdit,
  handleSaveLater,
  handleDiscardDraft,
  giftFinalPage,
  onRemoveGiftCode,
  giftCodeField,
}: IntakeFormBodyProps) {
  return (
    <form
      ref={formRef}
      onSubmit={handleSubmit}
      onKeyDown={suppressEnterInNonSubmitFields}
      noValidate
      className="relative flex flex-col gap-10"
      {...CLARITY_MASK_PROPS}
    >
      {isSubmitting ? <SubmitOverlay text={loadingStateCopy} /> : null}
      <HoneypotField value={honeypot} onChange={setHoneypot} />

      {totalPages > 0 ? (
        <div className="flex items-center justify-between gap-4">
          <PageIndicator
            pageNumber={currentPage + 1}
            totalPages={totalPages}
            tagline={pageIndicatorTagline}
          />
          {lastSavedAt ? <DiscardDraftButton onConfirm={handleDiscardDraft} /> : null}
        </div>
      ) : null}

      {currentSections.map((section) => (
        <RenderedSection
          key={section._id}
          section={section}
          pairedUnknownKeys={pairedUnknownKeys}
          context={renderContext}
        />
      ))}

      {isFinalPage ? (
        <ReviewSummary
          pages={pages}
          values={values}
          currentPageIndex={currentPage}
          onEdit={handleReviewEdit}
        />
      ) : null}

      {isFinalPage ? (
        <div className="flex flex-col gap-6">
          {testimonial ? <TestimonialLine {...testimonial} /> : null}
          <LegalAcknowledgments
            snapshot={consentSnapshot}
            setSnapshot={setConsentSnapshot}
            errors={consentErrors}
            clearError={clearConsentError}
            nonRefundableNotice={nonRefundableNotice}
            isSubmitting={isSubmitting}
            showCoolingOff={showCoolingOff}
          />
          {giftFinalPage ? (
            <GiftFinalPageLines {...giftFinalPage} onRemove={onRemoveGiftCode} />
          ) : null}
          {giftCodeField ? <GiftCodeField {...giftCodeField} /> : null}
        </div>
      ) : null}

      <InvisibleTurnstile challenge={turnstile} />

      {submitError ? (
        <p role="alert" className={errorClasses}>
          {submitError}
        </p>
      ) : null}

      <PageValidationSummary
        errorCount={errorCount}
        firstFieldLabel={firstFieldLabel}
        onJumpToFirstError={onJumpToFirstError}
      />

      <PageNav
        isFirstPage={isFirstPage}
        isFinalPage={isFinalPage}
        backHref={homeReadingAnchor(readingId)}
        onBack={handleBack}
        onNext={() => {
          onAdvanceAttempt();
          handleNext();
        }}
        onSaveLater={handleSaveLater}
        onSubmitIntent={() => {
          submitIntentRef.current = true;
          onAdvanceAttempt();
        }}
        isSubmitting={isSubmitting}
        nextDisabled={submitDisabled}
        submitDisabled={submitDisabled}
        saveLaterDisabled={valuesUntouched}
        submitLabel={submitLabel}
        nextLabel={nextLabel}
        saveLaterLabel={saveLaterLabel}
        savedIndicator={savedIndicator}
      />

      <p className="sr-only">{`Booking form for ${readingName}`}</p>
    </form>
  );
}
