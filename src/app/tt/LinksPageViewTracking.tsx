"use client";

import { useEffect } from "react";

import { track } from "@/lib/analytics";

function referrerHost(): string {
  try {
    return new URL(document.referrer).host;
  } catch {
    return "";
  }
}

export function LinksPageViewTracking() {
  useEffect(() => {
    track("links_page_view", { referrer_host: referrerHost(), viewport_width: window.innerWidth });
  }, []);
  return null;
}
