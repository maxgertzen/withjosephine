"use client";

import { useCallback, useState } from "react";

import type { GiftCodeCheckMessages } from "@/lib/gift/giftCopyKeys";
import { type GiftCodeCheckOutcome, useGiftCodeCheck } from "@/lib/gift/useGiftCodeCheck";
import { GIFT_CHECK_API_ROUTE } from "@/lib/http/routes";

export type GiftCodeFieldState = {
  value: string;
  onChange: (value: string) => void;
  checking: boolean;
  error?: string;
  check: () => Promise<GiftCodeCheckOutcome | null>;
};

export function useGiftCodeField(
  readingSlug: string,
  messages: GiftCodeCheckMessages | undefined,
  endpoint: string | null = GIFT_CHECK_API_ROUTE,
): GiftCodeFieldState {
  const [value, setValue] = useState("");
  const [error, setError] = useState<string | undefined>();
  const { check: checkCode, checking } = useGiftCodeCheck({ readingSlug, endpoint, messages });

  const onChange = useCallback((next: string) => {
    setValue(next);
    setError(undefined);
  }, []);

  const check = async () => {
    setError(undefined);
    const outcome = await checkCode(value);
    if (outcome && outcome.kind !== "valid") setError(outcome.message);
    return outcome;
  };

  return { value, onChange, checking, error, check };
}
