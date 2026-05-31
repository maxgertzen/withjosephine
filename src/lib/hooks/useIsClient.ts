import { useSyncExternalStore } from "react";

/**
 * Returns false during SSR and the first client render (preserving hydration
 * match), then true after hydration completes. Use for content that must
 * differ between server and client without triggering a React hydration
 * warning.
 *
 * Implementation pattern follows react-aria's `useIsSSR`
 * (https://react-spectrum.adobe.com/react-aria/useIsSSR.html). The
 * `useSyncExternalStore` API is used not for a real store, but for its
 * dual-snapshot guarantee: `getServerSnapshot` runs during SSR + the first
 * client render, `getSnapshot` runs after hydration. The values it returns
 * are stable per render phase so the result is hydration-safe without
 * `useEffect`/`setState` (which the React Compiler eslint rule flags).
 */
const noopSubscribe = () => () => {};
const getSnapshot = () => true;
const getServerSnapshot = () => false;

export function useIsClient(): boolean {
  return useSyncExternalStore(noopSubscribe, getSnapshot, getServerSnapshot);
}
