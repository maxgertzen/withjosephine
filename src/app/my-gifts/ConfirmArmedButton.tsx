"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { Button } from "@/components/Button";
import { InlineError } from "@/components/Form/InlineError";
import type { MyGiftsPageContent } from "@/data/defaults";
import { useReducedMotion } from "@/lib/a11y/useReducedMotion";
import { useMutationAction } from "@/lib/hooks/useMutationAction";

export const ARM_RESET_MS = 5000;
export const ARM_RESET_MS_REDUCED_MOTION = 15000;

/**
 * Two-stage confirm button for destructive or irreversible gift actions.
 * First tap arms; second tap (within ARM_RESET_MS) fires the POST. Disarms
 * on ANY non-success outcome so the user never sees an indefinitely-armed
 * state after a failed action.
 *
 * Replaces the triplicated arm-state + ARM_RESET effect + onConfirm pattern
 * previously inlined in FlipToSelfSendControl / SendNowControl /
 * CancelScheduledControl.
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
  variant = "default",
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
  variant?: "default" | "destructive";
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
      setArmed(false);
    }
  }

  const confirmVariant = variant === "destructive" ? "destructive" : "primary";
  const topError = mapError(action.topError, copy, errorOverrides);

  return (
    <div className="flex flex-col gap-1 items-stretch sm:items-end">
      {armed ? (
        <Button
          variant={confirmVariant}
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
    </div>
  );
}

function mapError(
  code: string | null,
  copy: MyGiftsPageContent,
  overrides: Partial<Record<string, keyof MyGiftsPageContent>> = {},
): string | null {
  if (!code) return null;
  const overrideKey = overrides[code];
  if (overrideKey) return copy[overrideKey];
  if (code === "network") return copy.actionNetworkError;
  return copy.actionGenericError;
}
