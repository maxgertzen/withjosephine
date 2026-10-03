"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";

import { clearEntryClickAwayFrom } from "@/lib/intake/entryMarker";

export function EntryClickReset() {
  const pathname = usePathname();
  useEffect(() => clearEntryClickAwayFrom(pathname), [pathname]);
  return null;
}
