import { act, renderHook } from "@testing-library/react";
import { useRef, useState } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/analytics", () => ({
  track: vi.fn(),
  identifySubmission: vi.fn(),
}));

import type { LegalAcknowledgmentsErrors } from "@/components/IntakeForm/LegalAcknowledgments";
import type { FieldValues } from "@/components/IntakeForm/types";
import { emptyConsentSnapshot } from "@/lib/compliance/intakeConsent";
import type { SanityFormField } from "@/lib/sanity/types";

import {
  useIntakeFormHandlers,
  type UseIntakeFormHandlersArgs,
} from "./useIntakeFormHandlers";

function useTestHarness(overrides: Partial<UseIntakeFormHandlersArgs> = {}) {
  const formRef = useRef<HTMLFormElement | null>(null);
  const submitIntentRef = useRef(false);
  const [values, setValues] = useState<FieldValues>({});
  const [currentPage, setCurrentPage] = useState(0);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [consentErrors, setConsentErrors] = useState<LegalAcknowledgmentsErrors>(
    {},
  );

  const handlers = useIntakeFormHandlers({
    mode: "create",
    readingId: "soul-blueprint",
    draftScope: "soul-blueprint",
    formRef,
    submitIntentRef,
    values,
    setValues,
    allFields: [] as SanityFormField[],
    currentPage,
    setCurrentPage,
    totalPages: 3,
    isFinalPage: false,
    currentKeys: [],
    submissionSchema: { safeParse: () => ({ success: true, data: {} }) } as never,
    setErrors,
    setSubmitError,
    setIsSubmitting,
    consentSnapshot: emptyConsentSnapshot(),
    setConsentErrors,
    honeypot: "",
    turnstileRequired: false,
    turnstileToken: null,
    requestFreshTurnstileToken: async () => null,
    flushSave: () => {},
    ...overrides,
  });

  return {
    handlers,
    values,
    currentPage,
    errors,
    submitError,
    isSubmitting,
    consentErrors,
  };
}

beforeEach(() => {
  document.body.innerHTML = "";
});

describe("useIntakeFormHandlers — setValue", () => {
  it("sets the value at the given key", () => {
    const { result } = renderHook(() => useTestHarness());
    act(() => {
      result.current.handlers.setValue("fullName", "Ada");
    });
    expect(result.current.values.fullName).toBe("Ada");
  });

  it("clears any error entry on the same key", () => {
    const { result } = renderHook(() => useTestHarness());
    act(() => {
      result.current.handlers.setValue("fullName", "Ada");
    });
    expect(result.current.errors.fullName).toBeUndefined();
  });
});

describe("useIntakeFormHandlers — navigation", () => {
  it("handleBack clamps to 0 when at the first page", () => {
    const { result } = renderHook(() => useTestHarness());
    act(() => {
      result.current.handlers.handleBack();
    });
    expect(result.current.currentPage).toBe(0);
  });

  it("handleReviewEdit is a no-op when target page === currentPage", () => {
    const { result } = renderHook(() => useTestHarness());
    act(() => {
      result.current.handlers.handleReviewEdit(0);
    });
    expect(result.current.currentPage).toBe(0);
  });
});

describe("useIntakeFormHandlers — handleSubmit", () => {
  it("is a no-op when submitIntentRef is false", async () => {
    const { result } = renderHook(() => useTestHarness());
    const event = {
      preventDefault: vi.fn(),
    } as unknown as React.FormEvent<HTMLFormElement>;
    await act(async () => {
      await result.current.handlers.handleSubmit(event);
    });
    expect(event.preventDefault).toHaveBeenCalled();
    expect(result.current.isSubmitting).toBe(false);
  });
});
