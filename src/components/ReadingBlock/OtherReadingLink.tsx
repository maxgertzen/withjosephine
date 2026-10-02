"use client";

import type { ReactNode } from "react";

import { NavigationButton } from "@/components/NavigationButton";
import { bookingPath } from "@/lib/http/routes";
import { markEntryClickOnPlainLeftClick } from "@/lib/intake/entryMarker";

export function OtherReadingLink({ slug, children }: { slug: string; children: ReactNode }) {
  return (
    <NavigationButton
      href={bookingPath(slug)}
      className="flex flex-col gap-0.5 border-t border-j-border-subtle py-3 first-of-type:border-t-0 no-underline"
      onClick={markEntryClickOnPlainLeftClick(slug, "reading_switch")}
    >
      {children}
    </NavigationButton>
  );
}
