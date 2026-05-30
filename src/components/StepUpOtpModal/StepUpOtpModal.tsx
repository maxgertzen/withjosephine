"use client";

import {
  type FormEvent,
  type KeyboardEvent,
  type MouseEvent,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";

import { Button } from "@/components/Button";
import { InlineError } from "@/components/Form/InlineError";
import { CONTACT_EMAIL } from "@/lib/constants";
import { errorClassesSmall, invalidBorderClasses } from "@/lib/formStyles";
import { jsonPost } from "@/lib/http/jsonPost";

export type StepUpOtpModalProps = {
  open: boolean;
  onClose: () => void;
  /**
   * Called after the verify endpoint returns 200. The parent re-runs the
   * original mutation (via `useMutationAction.retry`) in response.
   */
  onElevated: () => void;
  /**
   * `mailto:` href surfaced on verify failure. Falls back to the project
   * support address when absent: the request endpoint guarantees a value
   * on 422, but the modal also opens before any failure has occurred and
   * must render a sensible fallback.
   */
  contactMailto?: string;
};

type RequestPhase =
  | { kind: "requesting" }
  | { kind: "ready"; devCode?: string }
  | { kind: "throttled"; retryAfterSec: number; reason: string }
  | { kind: "request_failed"; topError: string };

type VerifyError = {
  reason: string;
  message: string;
};

const HEADING_ID = "step-up-otp-heading";
const DESCRIPTION_ID = "step-up-otp-description";
const INPUT_ID = "step-up-otp-code";
const OTP_LENGTH = 6;
const OTP_PATTERN = /^[0-9]*$/;

const HEADER_COPY = "Quick verification";
const BODY_COPY =
  "We will email you a code to confirm. This protects against a forwarded link being misused.";
const HELPER_COPY = "Check your inbox for the 6 digit code.";
const SUBMIT_LABEL = "Verify";
const SUBMITTING_LABEL = "Verifying";
const CANCEL_LABEL = "Cancel";

const REQUEST_FAILED_COPY =
  "We could not send a code right now. Try again in a moment, or contact support.";

const VERIFY_ERROR_BY_REASON: Record<string, string> = {
  mismatch: "That code did not match. Try again, or contact support.",
  expired: "That code has expired. Request a new one, or contact support.",
  already_consumed:
    "That code has already been used. Request a new one, or contact support.",
  no_pending: "No active code. Request a new one, or contact support.",
  poisoned: "Too many tries. Contact support to continue.",
  invalid_body: "That code did not match. Try again, or contact support.",
};

const DEFAULT_VERIFY_ERROR_COPY =
  "We could not verify that code. Try again, or contact support.";

function buildVerifyError(body: unknown): VerifyError {
  if (body && typeof body === "object") {
    const record = body as Record<string, unknown>;
    const reason =
      typeof record.reason === "string" ? record.reason : "unknown";
    return {
      reason,
      message: VERIFY_ERROR_BY_REASON[reason] ?? DEFAULT_VERIFY_ERROR_COPY,
    };
  }
  return { reason: "unknown", message: DEFAULT_VERIFY_ERROR_COPY };
}

function resolveMailto(value: string | undefined): string {
  if (value && value.length > 0) return value;
  return `mailto:${CONTACT_EMAIL}`;
}

function readThrottle(body: unknown): {
  retryAfterSec: number;
  reason: string;
} {
  if (body && typeof body === "object") {
    const record = body as Record<string, unknown>;
    const retryAfterSec =
      typeof record.retryAfterSec === "number" && record.retryAfterSec > 0
        ? Math.ceil(record.retryAfterSec)
        : 30;
    const reason =
      typeof record.reason === "string" ? record.reason : "throttled_gap";
    return { retryAfterSec, reason };
  }
  return { retryAfterSec: 30, reason: "throttled_gap" };
}

export function StepUpOtpModal(props: StepUpOtpModalProps) {
  const { open, onClose, onElevated, contactMailto } = props;
  const [phase, setPhase] = useState<RequestPhase>({ kind: "requesting" });
  const [code, setCode] = useState("");
  const [verifying, setVerifying] = useState(false);
  const [verifyError, setVerifyError] = useState<VerifyError | null>(null);
  const [countdown, setCountdown] = useState(0);

  const panelRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const previouslyFocusedRef = useRef<HTMLElement | null>(null);

  // Reset state and POST to /request whenever the modal opens. The `open`
  // prop is the external signal that a new step-up cycle has begun; the
  // synchronous setState calls seed the next render's UI before the async
  // fetch resolves. This is the legitimate "react to external prop change"
  // pattern; the cascading-render warning does not apply.
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setPhase({ kind: "requesting" });
    setCode("");
    setVerifyError(null);
    setCountdown(0);
    previouslyFocusedRef.current =
      typeof document !== "undefined"
        ? (document.activeElement as HTMLElement | null)
        : null;

    (async () => {
      const result = await jsonPost<{ devCode?: string }>(
        "/api/auth/step-up/request",
      );
      if (cancelled) return;
      if (result.ok) {
        setPhase({ kind: "ready", devCode: result.data?.devCode });
        return;
      }
      if (result.status === 429) {
        const { retryAfterSec, reason } = readThrottle(result.errorBody);
        setPhase({ kind: "throttled", retryAfterSec, reason });
        setCountdown(retryAfterSec);
        return;
      }
      if (result.status === 401 || result.status === 404) {
        onClose();
        return;
      }
      setPhase({
        kind: "request_failed",
        topError: result.topError ?? `http_${result.status}`,
      });
    })();

    return () => {
      cancelled = true;
    };
  }, [open, onClose]);
  /* eslint-enable react-hooks/set-state-in-effect */

  // Restore focus to the trigger when the modal closes.
  useEffect(() => {
    if (open) return;
    const previously = previouslyFocusedRef.current;
    if (previously && typeof previously.focus === "function") {
      previously.focus();
    }
  }, [open]);

  // Initial focus management: send focus into the panel when it opens.
  useEffect(() => {
    if (!open) return;
    // Defer one tick so the input is rendered.
    const t = setTimeout(() => {
      if (phase.kind === "ready" && inputRef.current) {
        inputRef.current.focus();
        return;
      }
      if (panelRef.current) {
        const focusable = collectFocusable(panelRef.current);
        if (focusable.length > 0) {
          focusable[0].focus();
          return;
        }
        panelRef.current.focus();
      }
    }, 0);
    return () => clearTimeout(t);
  }, [open, phase.kind]);

  // Throttle countdown: decrement once per second until zero.
  useEffect(() => {
    if (phase.kind !== "throttled" || countdown <= 0) return;
    const t = setTimeout(() => setCountdown((n) => n - 1), 1000);
    return () => clearTimeout(t);
  }, [phase.kind, countdown]);

  const closeIfAllowed = useCallback(() => {
    if (verifying) return;
    onClose();
  }, [onClose, verifying]);

  // ESC handler at the panel level (not document) so multiple modals can
  // coexist without stealing each other's key events.
  const onPanelKeyDown = useCallback(
    (event: KeyboardEvent<HTMLDivElement>) => {
      if (event.key === "Escape") {
        event.stopPropagation();
        closeIfAllowed();
      }
    },
    [closeIfAllowed],
  );

  // Focus trap: cycle Tab / Shift+Tab between focusable elements in panel.
  const onPanelKeyDownTrap = useCallback(
    (event: KeyboardEvent<HTMLDivElement>) => {
      if (event.key !== "Tab" || !panelRef.current) return;
      const focusable = collectFocusable(panelRef.current);
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      const active = document.activeElement;
      if (event.shiftKey) {
        if (active === first || !panelRef.current.contains(active)) {
          event.preventDefault();
          last.focus();
        }
      } else {
        if (active === last) {
          event.preventDefault();
          first.focus();
        }
      }
    },
    [],
  );

  const onBackdropClick = useCallback(
    (event: MouseEvent<HTMLDivElement>) => {
      if (event.target === event.currentTarget) closeIfAllowed();
    },
    [closeIfAllowed],
  );

  const onCodeChange = useCallback((next: string) => {
    if (!OTP_PATTERN.test(next)) return;
    setCode(next.slice(0, OTP_LENGTH));
    setVerifyError(null);
  }, []);

  const onSubmit = useCallback(
    async (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      if (code.length !== OTP_LENGTH || verifying) return;
      setVerifying(true);
      setVerifyError(null);
      const result = await jsonPost<{ elevatedAt: number }>(
        "/api/auth/step-up/verify",
        { code },
      );
      setVerifying(false);
      if (result.ok) {
        onElevated();
        onClose();
        return;
      }
      if (result.status === 422) {
        setVerifyError(buildVerifyError(result.errorBody));
        return;
      }
      if (result.status === 401 || result.status === 404) {
        onClose();
        return;
      }
      setVerifyError({
        reason: "network",
        message: DEFAULT_VERIFY_ERROR_COPY,
      });
    },
    [code, onClose, onElevated, verifying],
  );

  if (!open || typeof document === "undefined") return null;

  const mailtoHref = resolveMailto(contactMailto);
  const codeReady = code.length === OTP_LENGTH;
  const submitDisabled = !codeReady || verifying || phase.kind !== "ready";

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby={HEADING_ID}
      aria-describedby={DESCRIPTION_ID}
      data-testid="step-up-otp-modal"
      className="fixed inset-0 z-[100] flex items-center justify-center bg-j-deep/40 backdrop-blur-sm p-4 sm:p-6"
      onMouseDown={onBackdropClick}
    >
      <div
        ref={panelRef}
        tabIndex={-1}
        onKeyDown={(event) => {
          onPanelKeyDown(event);
          onPanelKeyDownTrap(event);
        }}
        className="bg-j-cream rounded-3xl shadow-xl p-6 sm:p-8 max-w-md w-full outline-none"
      >
        <h2
          id={HEADING_ID}
          className="font-display italic text-2xl text-j-text-heading"
        >
          {HEADER_COPY}
        </h2>
        <p
          id={DESCRIPTION_ID}
          className="font-body text-sm text-j-text mt-3 leading-relaxed"
        >
          {BODY_COPY}
        </p>

        {phase.kind === "requesting" ? (
          <p
            role="status"
            aria-live="polite"
            className="font-body text-sm text-j-text-muted italic mt-5"
          >
            Sending a code to your inbox.
          </p>
        ) : null}

        {phase.kind === "throttled" ? (
          <p
            role="status"
            aria-live="polite"
            data-testid="step-up-throttle-message"
            className="font-body text-sm text-j-text-muted italic mt-5"
          >
            {`We sent a code recently. Try again in ${Math.max(countdown, 0)} seconds.`}
          </p>
        ) : null}

        {phase.kind === "request_failed" ? (
          <div className="mt-5">
            <InlineError message={REQUEST_FAILED_COPY} />
          </div>
        ) : null}

        {phase.kind === "ready" ? (
          <form onSubmit={onSubmit} className="mt-5 flex flex-col gap-4" noValidate>
            <p className="font-body text-xs text-j-text-muted">{HELPER_COPY}</p>
            <label htmlFor={INPUT_ID} className="sr-only">
              6 digit code
            </label>
            <input
              ref={inputRef}
              id={INPUT_ID}
              name="code"
              type="text"
              value={code}
              onChange={(event) => onCodeChange(event.target.value)}
              inputMode="numeric"
              pattern="[0-9]*"
              autoComplete="one-time-code"
              maxLength={OTP_LENGTH}
              aria-label="6 digit code"
              aria-invalid={verifyError ? true : undefined}
              aria-describedby={verifyError ? `${INPUT_ID}-error` : undefined}
              disabled={verifying}
              className={`rounded-lg border border-j-border-subtle bg-white/70 px-4 py-3 font-mono text-2xl tracking-[0.5em] text-center text-j-text focus:outline-none focus:border-j-accent ${invalidBorderClasses}`}
            />
            {verifyError ? (
              <div
                id={`${INPUT_ID}-error`}
                className="flex flex-col gap-1"
                data-testid="step-up-verify-error"
              >
                <InlineError message={verifyError.message} />
                <a
                  href={mailtoHref}
                  className={`${errorClassesSmall} underline underline-offset-2`}
                  data-testid="step-up-contact-link"
                >
                  Contact support
                </a>
              </div>
            ) : null}
            <div className="flex gap-3 justify-end mt-2">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={onClose}
                disabled={verifying}
              >
                {CANCEL_LABEL}
              </Button>
              <Button
                type="submit"
                variant="primary"
                size="sm"
                disabled={submitDisabled}
              >
                {verifying ? SUBMITTING_LABEL : SUBMIT_LABEL}
              </Button>
            </div>
          </form>
        ) : (
          <div className="flex gap-3 justify-end mt-5">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={onClose}
            >
              {CANCEL_LABEL}
            </Button>
            {phase.kind === "request_failed" ? (
              <a
                href={mailtoHref}
                className="font-body text-xs text-j-text-muted underline underline-offset-2 self-center"
                data-testid="step-up-contact-link"
              >
                Contact support
              </a>
            ) : null}
          </div>
        )}
      </div>
    </div>,
    document.body,
  );
}

function collectFocusable(root: HTMLElement): HTMLElement[] {
  const selector =
    'a[href], button:not([disabled]), input:not([disabled]), textarea:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';
  return Array.from(root.querySelectorAll<HTMLElement>(selector)).filter(
    (el) => !el.hasAttribute("inert") && el.offsetParent !== null,
  );
}
