"use client";

import Link from "next/link";
import { type ComponentProps, type ReactNode,useEffect, useRef } from "react";

import { LinkContent } from "@/components/NavigationButton/LinkSpinner";
import {
  type ClientEventMap,
  type ClientEventName,
  type ReadingId,
  track,
} from "@/lib/analytics";

/**
 * Two client primitives for tracking events from server pages —
 * `<EntryPageView>` for the one mount-fire event, and `<TrackedLink>`
 * for click events. Both are typed against `ClientEventMap`, so the
 * `event` and `properties` props enforce the right shape at the call
 * site (typo a property name → typecheck fails).
 *
 * Why typed wrappers and not `data-mp-*` attribute delegation
 * (ChargeAfter's pattern): our 13 SPEC §15 events have specific
 * required property shapes (`cta_click_intake` requires `reading_id`
 * + `position`). Attribute delegation loses the typecheck and silently
 * ships events with wrong/missing properties. ChargeAfter's pattern
 * works there because their events are GENERIC (`button_click` with
 * `button_name`); ours aren't. A delegated `data-mp-*` listener is
 * planned for ad-hoc tagging in a Phase-2 follow-up (see
 * www/docs/POST_LAUNCH_BACKLOG.md).
 */

/**
 * Fire `entry_page_view` once on mount. `referrer` and `viewport_width`
 * are client-only so they're read here rather than passed down from the
 * server. Specific (not generic) because no other SPEC §15 event needs
 * window-derived properties on a server page — every other mount-fire
 * happens inside an existing client component (IntakeForm).
 */
export function EntryPageView({ readingId }: { readingId: ReadingId }) {
  const fired = useRef(false);
  useEffect(() => {
    if (fired.current) return;
    fired.current = true;
    track("entry_page_view", {
      reading_id: readingId,
      referrer: typeof document !== "undefined" ? document.referrer : "",
      viewport_width: typeof window !== "undefined" ? window.innerWidth : 0,
    });
  }, [readingId]);
  return null;
}

type TrackedLinkProps<E extends ClientEventName> = Omit<
  ComponentProps<typeof Link>,
  "onClick" | "children"
> & {
  event: E;
  properties: ClientEventMap[E];
  pendingLabel?: string;
  children: ReactNode;
};

/**
 * Wraps a Next.js Link to fire `event` synchronously before navigation.
 * Includes the same `useLinkStatus` spinner as `<NavigationButton>` via
 * `<LinkContent>`. Mixpanel queues internally on track(), so we don't
 * await — avoids navigation lag.
 */
export function TrackedLink<E extends ClientEventName>({
  event,
  properties,
  pendingLabel,
  children,
  ...linkProps
}: TrackedLinkProps<E>) {
  return (
    <Link
      {...linkProps}
      onClick={() => {
        track(event, properties);
      }}
    >
      <LinkContent pendingLabel={pendingLabel}>{children}</LinkContent>
    </Link>
  );
}
