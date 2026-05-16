"use client";

import { type TurnstileInstance } from "@marsidev/react-turnstile";
import { type RefObject, useCallback, useRef, useState } from "react";

export type UseTurnstileChallengeResult = {
  turnstileRequired: boolean;
  turnstileSiteKey: string | undefined;
  turnstileToken: string | null;
  turnstileRef: RefObject<TurnstileInstance | null>;
  handleSuccess: (token: string) => void;
  handleFailure: () => void;
  requestFreshToken: () => Promise<string | null>;
};

export function useTurnstileChallenge(): UseTurnstileChallengeResult {
  const turnstileSiteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;
  const turnstileBypass =
    process.env.NODE_ENV !== "production" &&
    process.env.NEXT_PUBLIC_BOOKING_TURNSTILE_BYPASS === "1";
  const turnstileRequired = Boolean(turnstileSiteKey) && !turnstileBypass;

  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);
  const turnstileRef = useRef<TurnstileInstance | null>(null);
  const resolverRef = useRef<((token: string | null) => void) | null>(null);

  const handleSuccess = useCallback((token: string) => {
    setTurnstileToken(token);
    resolverRef.current?.(token);
    resolverRef.current = null;
  }, []);

  const handleFailure = useCallback(() => {
    setTurnstileToken(null);
    resolverRef.current?.(null);
    resolverRef.current = null;
  }, []);

  const requestFreshToken = useCallback(async (): Promise<string | null> => {
    if (turnstileBypass) return "bypass";
    if (!turnstileSiteKey || !turnstileRef.current) return null;
    return new Promise<string | null>((resolve) => {
      resolverRef.current = resolve;
      turnstileRef.current?.reset();
      turnstileRef.current?.execute();
    });
  }, [turnstileBypass, turnstileSiteKey]);

  return {
    turnstileRequired,
    turnstileSiteKey,
    turnstileToken,
    turnstileRef,
    handleSuccess,
    handleFailure,
    requestFreshToken,
  };
}
