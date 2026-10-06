"use client";

import { useState } from "react";

import { applyTokens } from "@/lib/emails/applyTokens";

import type { GiftCheckRequest, GiftCheckResponse } from "./giftCheck";
import { normalizeGiftCode } from "./giftCodeFormat";
import type { GiftCodeCheckMessages } from "./giftCopyKeys";

export type GiftCodeCheckOutcome =
  | { kind: "valid"; path: string }
  | { kind: "other_reading"; readingName: string; path: string; message: string }
  | { kind: "error"; message: string };

type UseGiftCodeCheckArgs = {
  readingSlug: string;
  endpoint: string | null;
  messages: GiftCodeCheckMessages | undefined;
};

function outcomeFor(
  body: GiftCheckResponse,
  messages: GiftCodeCheckMessages,
): GiftCodeCheckOutcome {
  switch (body.result) {
    case "valid":
      return { kind: "valid", path: body.path };
    case "other_reading":
      return {
        kind: "other_reading",
        readingName: body.readingName,
        path: body.path,
        message: applyTokens(messages.codeOtherReadingTemplate, { reading: body.readingName }),
      };
    case "rate_limited":
      return { kind: "error", message: messages.codeTooManyTries };
    case "not_found":
      return { kind: "error", message: messages.codeNotFound };
  }
}

async function postCheck(
  endpoint: string,
  request: GiftCheckRequest,
  messages: GiftCodeCheckMessages,
): Promise<GiftCodeCheckOutcome> {
  let response: Response;
  try {
    response = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(request),
    });
  } catch {
    return { kind: "error", message: messages.sheetNetworkFailed };
  }
  const body = (await response.json().catch(() => null)) as GiftCheckResponse | null;
  return body?.result
    ? outcomeFor(body, messages)
    : { kind: "error", message: messages.sheetSubmitFailed };
}

export function useGiftCodeCheck({ readingSlug, endpoint, messages }: UseGiftCodeCheckArgs) {
  const [checking, setChecking] = useState(false);

  const check = async (code: string): Promise<GiftCodeCheckOutcome | null> => {
    if (!messages) return null;
    const trimmed = code.trim();
    if (!trimmed) return { kind: "error", message: messages.redeemSheetEmpty };
    if (!normalizeGiftCode(trimmed)) return { kind: "error", message: messages.codeNotFound };
    if (!endpoint) return null;

    setChecking(true);
    try {
      return await postCheck(endpoint, { code: trimmed, readingSlug }, messages);
    } finally {
      setChecking(false);
    }
  };

  return { check, checking };
}
