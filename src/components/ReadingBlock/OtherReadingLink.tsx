"use client";

import Link from "next/link";
import type { ReactNode } from "react";

import { bookingPath } from "@/lib/http/routes";
import { markEntryClickOnPlainLeftClick } from "@/lib/intake/entryMarker";

export function OtherReadingLink({ slug, children }: { slug: string; children: ReactNode }) {
  return (
    <Link
      href={bookingPath(slug)}
      className="flex flex-col gap-0.5 border-t border-j-border-subtle py-3 first-of-type:border-t-0 no-underline"
      onClick={markEntryClickOnPlainLeftClick(slug, "reading_switch")}
    >
      {children}
    </Link>
  );
}
