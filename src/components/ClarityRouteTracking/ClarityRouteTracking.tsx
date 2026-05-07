"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";

import type { ClarityWindow } from "@/lib/clarity";

// App Router soft navigations don't fire the Clarity tag's own page-detect
// handler, so the multi-step intake flow (`/book/<reading>` → `/letter` →
// `/intake`) shows up as one page in replays without this. Initial-load is
// already covered by Clarity's snapshot, so we skip the first render and
// only fire on actual path changes.
//
// Docs: github.com/microsoft/clarity/issues/175

export function ClarityRouteTracking() {
  const pathname = usePathname();
  const previousPathnameRef = useRef<string | null>(null);

  useEffect(() => {
    const previous = previousPathnameRef.current;
    previousPathnameRef.current = pathname;
    if (previous === null) return;
    if (previous === pathname) return;
    const w = window as ClarityWindow;
    if (typeof w.clarity !== "function") return;
    w.clarity("set", "page", pathname);
  }, [pathname]);

  return null;
}
