"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { Button } from "@/components/Button";
import { InlineError } from "@/components/Form/InlineError";
import { StepUpOtpModal } from "@/components/StepUpOtpModal";
import type { MyGiftsPageContent } from "@/data/defaults";
import { useReducedMotion } from "@/lib/a11y/useReducedMotion";
import { useMutationAction } from "@/lib/hooks/useMutationAction";

import { actionErrorLabel } from "./actionErrorLabel";

export const ARM_RESET_MS = 5000;
export const ARM_RESET_MS_REDUCED_MOTION = 15000;

/**
 * Two-stage confirm button for destructive or irreversible gift actions.
 * First tap arms; second tap (within ARM_RESET_MS) fires the POST. Disarms
 * on ANY non-success outcome so the user never sees an indefinitely-armed
 * state after a failed action.
 *
 * WCAG 2.2.1 (Timing Adjustable, Level A): the 5s arm window is a
 * time-limited interaction. When the user has `prefers-reduced-motion:
 * reduce` set, the window extends to 15s (ARM_RESET_MS_REDUCED_MOTION)
 * via the `useReducedMotion` hook. The OS-level toggle is the user's
 * extension switch — no in-app affordance needed.
 */
export function ConfirmArmedButton({
  endpoint,
  copy,
  labels,
  errorOverrides,
  onSuccess,
}: {
  endpoint: string;
  copy: MyGiftsPageContent;
  labels: {
    idle: string;
    confirm: string;
    sending: string;
  };
  errorOverrides?: Partial<Record<string, keyof MyGiftsPageContent>>;
  onSuccess?: () => void;
}) {
  const router = useRouter();
  const [armed, setArmed] = useState(false);
  const action = useMutationAction(endpoint);
  const reducedMotion = useReducedMotion();
  const armResetMs = reducedMotion ? ARM_RESET_MS_REDUCED_MOTION : ARM_RESET_MS;

  useEffect(() => {
    if (!armed || action.submitting) return;
    const t = setTimeout(() => setArmed(false), armResetMs);
    return () => clearTimeout(t);
  }, [armed, action.submitting, armResetMs]);

  async function onConfirm() {
    const result = await action.run();
    if (result.ok) {
      if (onSuccess) onSuccess();
      else router.refresh();
    } else {
      // Keep the button armed while the step-up modal is open so a
      // successful elevation can replay the mutation without the user
      // re-arming. Disarm on any other non-success.
      const stillElevating =
        result.status === 401 &&
        typeof result.errorBody === "object" &&
        result.errorBody !== null &&
        (result.errorBody as { error?: unknown }).error === "elevation_required";
      if (!stillElevating) setArmed(false);
    }
  }

  async function onElevated() {
    const result = await action.retry();
    if (result && result.ok) {
      if (onSuccess) onSuccess();
      else router.refresh();
      setArmed(false);
    }
  }

  function onModalClose() {
    action.reset();
    setArmed(false);
  }

  const topError = actionErrorLabel(action.topError, copy, errorOverrides);
  const elevationOpen = action.elevationRequired !== null;

  return (
    <div className="flex flex-col gap-1 items-stretch sm:items-end">
      {armed ? (
        <Button
          variant="primary"
          size="sm"
          disabled={action.submitting}
          onClick={onConfirm}
        >
          {action.submitting ? labels.sending : labels.confirm}
        </Button>
      ) : (
        <Button variant="outlined" size="sm" onClick={() => setArmed(true)}>
          {labels.idle}
        </Button>
      )}
      <InlineError message={topError} />
      <StepUpOtpModal
        open={elevationOpen}
        onClose={onModalClose}
        onElevated={onElevated}
        contactMailto={action.elevationRequired?.contactMailto}
      />
    </div>
  );
}
