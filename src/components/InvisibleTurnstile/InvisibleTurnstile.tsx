"use client";

import { Turnstile } from "@marsidev/react-turnstile";

import type { UseTurnstileChallengeResult } from "@/lib/intake/useTurnstileChallenge";

type InvisibleTurnstileProps = {
  challenge: Pick<
    UseTurnstileChallengeResult,
    "turnstileRequired" | "turnstileSiteKey" | "turnstileRef" | "handleSuccess" | "handleFailure"
  >;
};

export function InvisibleTurnstile({ challenge }: InvisibleTurnstileProps) {
  const { turnstileRequired, turnstileSiteKey, turnstileRef, handleSuccess, handleFailure } =
    challenge;
  if (!turnstileRequired || !turnstileSiteKey) return null;

  return (
    <div className="sr-only" aria-hidden="true">
      <Turnstile
        ref={turnstileRef}
        siteKey={turnstileSiteKey}
        options={{ execution: "execute", appearance: "interaction-only" }}
        onSuccess={handleSuccess}
        onExpire={handleFailure}
        onError={handleFailure}
      />
    </div>
  );
}
