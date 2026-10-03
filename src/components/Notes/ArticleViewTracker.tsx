"use client";

import { useEffect } from "react";

import { track } from "@/lib/analytics";

const IN_SITE_NAVIGATION = "internal";

function landedOnThisPage(): boolean {
  const [load] = performance.getEntriesByType("navigation");
  return !load || load.name === window.location.href;
}

export function ArticleViewTracker({ note }: { note: string }) {
  useEffect(() => {
    track("article_view", {
      note,
      referrer: landedOnThisPage() ? document.referrer : IN_SITE_NAVIGATION,
      viewport_width: window.innerWidth,
    });
  }, [note]);
  return null;
}
