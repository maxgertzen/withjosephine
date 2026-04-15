"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import type { MouseEvent } from "react";
import { ROUTES } from "@/lib/constants";

export function BackLink() {
  const router = useRouter();

  function handleClick(event: MouseEvent<HTMLAnchorElement>) {
    if (typeof window === "undefined") return;

    // Respect modifier keys / middle-click — let the browser handle them.
    if (
      event.defaultPrevented ||
      event.button !== 0 ||
      event.metaKey ||
      event.ctrlKey ||
      event.shiftKey ||
      event.altKey
    ) {
      return;
    }

    // Only use history.back() if the previous page was on this site.
    const cameFromSameOrigin =
      document.referrer &&
      new URL(document.referrer).origin === window.location.origin;

    if (cameFromSameOrigin && window.history.length > 1) {
      event.preventDefault();
      router.back();
    }
  }

  return (
    <Link
      href={ROUTES.home}
      onClick={handleClick}
      className="flex items-center gap-2 font-body text-sm text-j-text-muted hover:text-j-accent transition-colors"
    >
      <ArrowLeft className="w-4 h-4" />
      Back
    </Link>
  );
}
