import { act, renderHook } from "@testing-library/react";
import { useRef, useState } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/analytics", () => ({
  track: vi.fn(),
  identifySubmission: vi.fn(),
}));

import type { LegalAcknowledgmentsErrors } from "@/components/IntakeForm/LegalAcknowledgments";
import type { FieldValues } from "@/components/IntakeForm/types";
import { GIFT_DEFAULTS } from "@/data/defaults";
import { emptyConsentSnapshot, type LegalConsentSnapshot } from "@/lib/compliance/intakeConsent";
import type { GiftCodeCheckOutcome } from "@/lib/gift/useGiftCodeCheck";
import type { SanityFormField } from "@/lib/sanity/types";

import { restore as restoreDraft, save as saveDraft } from "./localStorageDraft";
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
    readingId: "soul-blueprint",
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
    pageIndexOfField: () => -1,
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

function submitEvent(): React.FormEvent<HTMLFormElement> {
  return { preventDefault: vi.fn() } as unknown as React.FormEvent<HTMLFormElement>;
}

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

  it.each([
    ["handleNext", (handlers: ReturnType<typeof useTestHarness>["handlers"]) => handlers.handleNext()],
    ["handleReviewEdit", (handlers: ReturnType<typeof useTestHarness>["handlers"]) => handlers.handleReviewEdit(2)],
  ])("%s scrolls to the form, not the page top", (_name, navigate) => {
    const form = document.createElement("form");
    const scrollIntoView = vi.spyOn(form, "scrollIntoView").mockImplementation(() => {});
    const scrollTo = vi.spyOn(window, "scrollTo").mockImplementation(() => {});
    const { result } = renderHook(() => useTestHarness({ formRef: { current: form } }));
    act(() => {
      navigate(result.current.handlers);
    });
    expect(scrollIntoView).toHaveBeenCalledWith({ behavior: "smooth", block: "start" });
    expect(scrollTo).not.toHaveBeenCalled();
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
    const event = submitEvent();
    await act(async () => {
      await result.current.handlers.handleSubmit(event);
    });
    expect(event.preventDefault).toHaveBeenCalled();
    expect(result.current.isSubmitting).toBe(false);
  });
});

describe("useIntakeFormHandlers — pending state timing (u7usxewf)", () => {
  it("flips pending true before the first await (continue-payment, create mode)", async () => {
    const setIsSubmitting = vi.fn();
    const requestFreshTurnstileToken = vi.fn(async () => "tok");
    const { result } = renderHook(() =>
      useTestHarness({
        isFinalPage: true,
        submitIntentRef: { current: true },
        setIsSubmitting,
        consentSnapshot: fullyConsented(),
        turnstileRequired: true,
        requestFreshTurnstileToken,
      }),
    );

    await act(async () => {
      await result.current.handlers.handleSubmit(submitEvent());
    });

    // Pending is set synchronously, BEFORE the turnstile token fetch (the
    // first await) — that is the whole fix: the button can't look dead.
    expect(setIsSubmitting).toHaveBeenCalledWith(true);
    expect(setIsSubmitting.mock.invocationCallOrder[0]).toBeLessThan(
      requestFreshTurnstileToken.mock.invocationCallOrder[0],
    );
  });

  it("never shows pending or asks Turnstile when consents are missing", async () => {
    const setIsSubmitting = vi.fn();
    const requestFreshTurnstileToken = vi.fn(async () => "tok");
    const { result } = renderHook(() =>
      useTestHarness({
        isFinalPage: true,
        submitIntentRef: { current: true },
        setIsSubmitting,
        turnstileRequired: true,
        requestFreshTurnstileToken,
      }),
    );

    await act(async () => {
      await result.current.handlers.handleSubmit(submitEvent());
    });

    expect(setIsSubmitting).not.toHaveBeenCalled();
    expect(requestFreshTurnstileToken).not.toHaveBeenCalled();
  });
});

const READING = "soul-blueprint";
const GIFT_CODE = "K7M2QX9PH4TR";

function fullyConsented(): LegalConsentSnapshot {
  const snapshot = emptyConsentSnapshot();
  return {
    ...snapshot,
    art6: { ...snapshot.art6, acknowledged: true },
    art9: { ...snapshot.art9, acknowledged: true },
    coolingOff: { ...snapshot.coolingOff, acknowledged: true },
  };
}

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), { status });
}

const fetchMock = vi.fn();
const assignMock = vi.fn();
const originalLocation = window.location;

function finalPageSubmitHarness(overrides: Partial<UseIntakeFormHandlersArgs> = {}) {
  return renderHook(() =>
    useTestHarness({
      isFinalPage: true,
      submitIntentRef: { current: true },
      consentSnapshot: fullyConsented(),
      ...overrides,
    }),
  );
}

async function pressSubmit(result: { current: ReturnType<typeof useTestHarness> }) {
  await act(async () => {
    await result.current.handlers.handleSubmit(submitEvent());
  });
}

const GIFT_ERRORS = {
  ending: {
    gift_already_redeemed: GIFT_DEFAULTS.openedRaceError,
    gift_not_found: GIFT_DEFAULTS.notFoundHeading,
    gift_not_active: GIFT_DEFAULTS.noLongerActiveHeading,
  },
  tooManyTries: GIFT_DEFAULTS.codeTooManyTries,
};

function giftMode(endGiftMode = vi.fn()) {
  return { code: GIFT_CODE, errors: GIFT_ERRORS, endGiftMode };
}

function postedBody(): Record<string, unknown> {
  return JSON.parse((fetchMock.mock.calls[0][1] as { body: string }).body);
}

function useStubbedFetchAndLocation() {
  beforeEach(() => {
    window.localStorage.clear();
    vi.stubGlobal("fetch", fetchMock);
    fetchMock.mockReset();
    assignMock.mockReset();
    Object.defineProperty(window, "location", {
      configurable: true,
      value: { href: "", assign: assignMock },
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    Object.defineProperty(window, "location", { configurable: true, value: originalLocation });
  });
}

describe("useIntakeFormHandlers — gift mode submit", () => {
  useStubbedFetchAndLocation();

  beforeEach(() => {
    saveDraft(READING, { currentPage: 1, values: { email: "anna@example.com" }, giftCode: GIFT_CODE });
  });

  it("sends the gift code, clears the draft and goes to the thank-you page on 200", async () => {
    fetchMock.mockResolvedValue(
      jsonResponse(200, { thankYouUrl: "/thank-you/soul-blueprint?submissionId=sub_1", submissionId: "sub_1" }),
    );
    const { result } = finalPageSubmitHarness({ gift: giftMode() });

    await pressSubmit(result);

    expect(postedBody().giftCode).toBe(GIFT_CODE);
    expect(restoreDraft(READING)).toBeNull();
    expect(window.location.href).toBe("/thank-you/soul-blueprint?submissionId=sub_1");
  });

  it("on a lost race clears the code, keeps the answers, ends gift mode and shows the race message", async () => {
    fetchMock.mockResolvedValue(jsonResponse(409, { error: "gift_already_redeemed" }));
    const endGiftMode = vi.fn();
    const { result } = finalPageSubmitHarness({ gift: giftMode(endGiftMode) });

    await pressSubmit(result);

    const draft = restoreDraft(READING);
    expect(draft?.giftCode).toBeUndefined();
    expect(draft?.values).toEqual({ email: "anna@example.com" });
    expect(endGiftMode).toHaveBeenCalledTimes(1);
    expect(result.current.submitError).toBe(GIFT_DEFAULTS.openedRaceError);
    expect(result.current.isSubmitting).toBe(false);
  });

  it.each([
    [404, "gift_not_found", GIFT_DEFAULTS.notFoundHeading],
    [409, "gift_not_active", GIFT_DEFAULTS.noLongerActiveHeading],
  ])("on %s %s shows its message and leaves gift mode", async (status, error, message) => {
    fetchMock.mockResolvedValue(jsonResponse(status, { error }));
    const endGiftMode = vi.fn();
    const { result } = finalPageSubmitHarness({ gift: giftMode(endGiftMode) });

    await pressSubmit(result);

    expect(result.current.submitError).toBe(message);
    expect(endGiftMode).toHaveBeenCalled();
    expect(restoreDraft(READING)?.giftCode).toBeUndefined();
  });

  it("on 429 shows the too-many-tries message and keeps the code", async () => {
    fetchMock.mockResolvedValue(jsonResponse(429, { error: "rate_limited" }));
    const endGiftMode = vi.fn();
    const { result } = finalPageSubmitHarness({ gift: giftMode(endGiftMode) });

    await pressSubmit(result);

    expect(result.current.submitError).toBe(GIFT_DEFAULTS.codeTooManyTries);
    expect(endGiftMode).not.toHaveBeenCalled();
    expect(restoreDraft(READING)?.giftCode).toBe(GIFT_CODE);
  });

  it("Remove clears the code and goes to the booking page", () => {
    const endGiftMode = vi.fn();
    const { result } = renderHook(() => useTestHarness({ gift: giftMode(endGiftMode) }));

    act(() => {
      result.current.handlers.handleRemoveGiftCode();
    });

    expect(restoreDraft(READING)?.giftCode).toBeUndefined();
    expect(restoreDraft(READING)?.values).toEqual({ email: "anna@example.com" });
    expect(endGiftMode).not.toHaveBeenCalled();
    expect(assignMock).toHaveBeenCalledWith("/book/soul-blueprint");
  });
});

describe("useIntakeFormHandlers — gift code field on the last page", () => {
  useStubbedFetchAndLocation();

  function codeField(
    outcome: GiftCodeCheckOutcome | null,
    value = " k7m2-qx9p-h4tr ",
    checking = false,
  ) {
    return { value, checking, check: vi.fn(async () => outcome) };
  }

  it("checks the code on the press, saves it with the draft and goes to the gift page when valid", async () => {
    const field = codeField({ kind: "valid", path: `/gift/${GIFT_CODE}` });
    const { result } = finalPageSubmitHarness({ giftCodeField: field });

    await pressSubmit(result);

    expect(field.check).toHaveBeenCalledTimes(1);
    expect(restoreDraft(READING)?.giftCode).toBe(GIFT_CODE);
    expect(assignMock).toHaveBeenCalledWith(`/gift/${GIFT_CODE}`);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("sends nothing else when the code is not valid", async () => {
    const field = codeField({ kind: "error", message: GIFT_DEFAULTS.codeNotFound });
    const { result } = finalPageSubmitHarness({ giftCodeField: field });

    await pressSubmit(result);

    expect(field.check).toHaveBeenCalledTimes(1);
    expect(fetchMock).not.toHaveBeenCalled();
    expect(assignMock).not.toHaveBeenCalled();
  });

  it("does nothing on a second press while the check is in flight", async () => {
    const field = codeField({ kind: "valid", path: `/gift/${GIFT_CODE}` }, GIFT_CODE, true);
    const { result } = finalPageSubmitHarness({ giftCodeField: field });

    await pressSubmit(result);

    expect(field.check).not.toHaveBeenCalled();
    expect(fetchMock).not.toHaveBeenCalled();
    expect(assignMock).not.toHaveBeenCalled();
  });

  it("submits as today when the field is empty", async () => {
    fetchMock.mockResolvedValue(
      jsonResponse(200, { paymentUrl: "https://buy.stripe.com/test", submissionId: "sub_1" }),
    );
    const field = codeField(null, "  ");
    const { result } = finalPageSubmitHarness({ giftCodeField: field });

    await pressSubmit(result);

    expect(field.check).not.toHaveBeenCalled();
    expect(fetchMock).toHaveBeenCalledWith("/api/booking", expect.objectContaining({ method: "POST" }));
    expect(postedBody().giftCode).toBeUndefined();
  });

  it("checks nothing until the press", () => {
    const field = codeField({ kind: "valid", path: `/gift/${GIFT_CODE}` });
    const { result } = renderHook(() => useTestHarness({ isFinalPage: true, giftCodeField: field }));

    act(() => {
      result.current.handlers.setValue("email", "anna@example.com");
    });

    expect(field.check).not.toHaveBeenCalled();
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe("useIntakeFormHandlers - preview", () => {
  useStubbedFetchAndLocation();

  beforeEach(() => {
    saveDraft(READING, { currentPage: 1, values: { email: "anna@example.com" }, giftCode: GIFT_CODE });
  });

  it("the last-page submit posts nothing and stays on the page", async () => {
    const { result } = finalPageSubmitHarness({ gift: giftMode(), preview: true });

    await pressSubmit(result);

    expect(fetchMock).not.toHaveBeenCalled();
    expect(window.location.href).toBe("");
    expect(result.current.isSubmitting).toBe(false);
  });

  it("Next still moves to the next page", async () => {
    const { result } = renderHook(() =>
      useTestHarness({ submitIntentRef: { current: true }, gift: giftMode(), preview: true }),
    );

    await pressSubmit(result);

    expect(result.current.currentPage).toBe(1);
  });

  it("Remove keeps the code and stays on the page", () => {
    const { result } = renderHook(() => useTestHarness({ gift: giftMode(), preview: true }));

    act(() => {
      result.current.handlers.handleRemoveGiftCode();
    });

    expect(restoreDraft(READING)?.giftCode).toBe(GIFT_CODE);
    expect(assignMock).not.toHaveBeenCalled();
  });
});

describe("useIntakeFormHandlers — server field errors", () => {
  useStubbedFetchAndLocation();

  it("shows the server's field errors and opens the page holding the first one", async () => {
    fetchMock.mockResolvedValue(
      jsonResponse(400, { error: "Validation failed", fieldErrors: { first_name: "Letters only." } }),
    );
    const setCurrentPage = vi.fn();
    const { result } = finalPageSubmitHarness({
      currentPage: 2,
      setCurrentPage,
      pageIndexOfField: (key) => (key === "first_name" ? 0 : -1),
    });
    await pressSubmit(result);
    expect(result.current.errors).toEqual({ first_name: "Letters only." });
    expect(setCurrentPage).toHaveBeenCalledWith(0);
    expect(result.current.submitError).toBe("Please fix the highlighted fields and try again.");
    expect(result.current.isSubmitting).toBe(false);
  });

  it("keeps the generic message for a 400 without field errors", async () => {
    fetchMock.mockResolvedValue(jsonResponse(400, { error: "Verification failed" }));
    const { result } = finalPageSubmitHarness();
    await pressSubmit(result);
    expect(result.current.errors).toEqual({});
    expect(result.current.submitError).toBe(
      "Some fields didn't pass validation. Please review and try again.",
    );
  });
});

describe("useIntakeFormHandlers — server field errors on fields this page does not have", () => {
  useStubbedFetchAndLocation();

  it("asks for a reload instead of claiming fields are highlighted", async () => {
    fetchMock.mockResolvedValue(
      jsonResponse(400, { error: "Validation failed", fieldErrors: { new_field: "Required." } }),
    );
    const { result } = finalPageSubmitHarness();
    await pressSubmit(result);
    expect(result.current.errors).toEqual({});
    expect(result.current.submitError).toBe(
      "This form was just updated. Please reload the page and try again.",
    );
    expect(result.current.isSubmitting).toBe(false);
  });
});
