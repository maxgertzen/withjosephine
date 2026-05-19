"use client";

import { useState, useSyncExternalStore } from "react";

import { resolveBrowserTimeZone } from "./timezone";

const subscribeBrowserTimeZone = () => {
  // Browser TZ has no runtime change event — the snapshot is one-shot per
  // mount. Returning a noop unsubscribe is the canonical useSyncExternalStore
  // shape for read-only client values.
  return () => {};
};

const getServerBrowserTimeZone = (): string | null => null;

/**
 * Resolves the IANA time zone the purchaser is scheduling in.
 *
 * Hydration-safe via `useSyncExternalStore`: the SSR snapshot is always `null`
 * (server can't know the browser zone), and React reconciles to the real value
 * after hydration. iOS Safari pre-17 returns a generic UTC offset instead of an
 * IANA name (RedTeam P-2); when that happens `browserTz` stays `null` and
 * consumers fall back to `pickedTz`.
 */
export function useEffectiveTimeZone() {
  const browserTz = useSyncExternalStore(
    subscribeBrowserTimeZone,
    resolveBrowserTimeZone,
    getServerBrowserTimeZone,
  );
  const [pickedTz, setPickedTz] = useState<string | null>(null);

  return {
    browserTz,
    pickedTz,
    setPickedTz,
    effectiveTz: browserTz ?? pickedTz,
    requiresPicker: browserTz === null,
  };
}
