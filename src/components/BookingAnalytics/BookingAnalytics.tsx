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
