"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

import { previewPathFor } from "@/lib/previewPath";
import { isSameOrigin } from "@/lib/utils";

function isUnmodifiedLeftButton(event: MouseEvent): boolean {
  return event.button === 0 && !event.metaKey && !event.ctrlKey && !event.shiftKey && !event.altKey;
}

export function PreviewLinkRouter() {
  const router = useRouter();

  useEffect(() => {
    const keepInsidePreview = (event: MouseEvent) => {
      if (!isUnmodifiedLeftButton(event)) return;
      const anchor = (event.target as Element | null)?.closest?.("a[href]");
      if (!(anchor instanceof HTMLAnchorElement) || anchor.target === "_blank") return;
      if (!isSameOrigin(anchor.href)) return;
      const url = new URL(anchor.href);
      const previewPath = previewPathFor(url.pathname);
      if (!previewPath) return;
      event.preventDefault();
      router.push(`${previewPath}${url.search}${url.hash}`);
    };
    document.addEventListener("click", keepInsidePreview);
    return () => document.removeEventListener("click", keepInsidePreview);
  }, [router]);

  return null;
}
