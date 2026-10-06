"use client";

import { useEffect, useRef, useState } from "react";

import { parseGiftSendFragment } from "@/lib/gift/giftCodeFormat";
import type { GiftSendStatus } from "@/lib/gift/giftSendContract";
import { jsonPost, type JsonPostResult } from "@/lib/http/jsonPost";
import { GIFT_SEND_STATUS_API_ROUTE } from "@/lib/http/routes";

const INVALID: GiftSendStatus = { state: "invalid" };
const STATUS_TRIES = 3;
const STATUS_RETRY_DELAY_MS = 400;

export type GiftSendLink = { token: string; status: GiftSendStatus | null };

function isNetworkOrServerFailure(result: JsonPostResult<unknown>): boolean {
  return result.status === 0 || result.status >= 500;
}

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchSendStatus(token: string): Promise<GiftSendStatus> {
  if (!token) return INVALID;
  const postStatus = () => jsonPost<GiftSendStatus>(GIFT_SEND_STATUS_API_ROUTE, { token });
  let result = await postStatus();
  for (let retry = 1; retry < STATUS_TRIES && isNetworkOrServerFailure(result); retry += 1) {
    await wait(STATUS_RETRY_DELAY_MS);
    result = await postStatus();
  }
  return result.ok && result.data ? result.data : INVALID;
}

function readAndClearSendToken(): string {
  const token = parseGiftSendFragment(window.location.hash);
  window.history.replaceState(null, "", window.location.pathname);
  return token ?? "";
}

export function useGiftSendLink(): GiftSendLink {
  const [link, setLink] = useState<GiftSendLink>({ token: "", status: null });
  const hasStarted = useRef(false);

  useEffect(() => {
    if (hasStarted.current) return;
    hasStarted.current = true;
    const token = readAndClearSendToken();
    void fetchSendStatus(token).then((status) => setLink({ token, status }));
  }, []);

  return link;
}
