"use client";

import { useSyncExternalStore } from "react";

const QUERY = "(prefers-reduced-motion: reduce)";

function subscribe(callback: () => void): () => void {
  if (typeof window === "undefined" || !window.matchMedia) return () => {};
  const mql = window.matchMedia(QUERY);
  mql.addEventListener("change", callback);
  return () => mql.removeEventListener("change", callback);
}

function getSnapshot(): boolean {
  if (typeof window === "undefined" || !window.matchMedia) return false;
  return window.matchMedia(QUERY).matches;
}

function getServerSnapshot(): boolean {
  return false;
}

/**
 * Reactive read of the user's `prefers-reduced-motion: reduce` media query.
 * Returns `false` on the server (deterministic SSR snapshot) and updates
 * reactively on the client when the OS-level preference flips.
 *
 * WCAG 2.2.1 (Timing Adjustable, Level A) — when a UI relies on a
 * time-limited interaction (e.g. the 5s `ConfirmArmedButton` arm window),
 * it must either let the user extend the time OR honour an existing
 * platform-level setting. Wiring this hook into the arm window so that
 * `prefers-reduced-motion: reduce` extends it to 15s is the platform-
 * setting path. The OS toggle IS the user's extension switch.
 */
export function useReducedMotion(): boolean {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
