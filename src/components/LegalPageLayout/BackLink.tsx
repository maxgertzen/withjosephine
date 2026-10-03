"use client";

import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { MouseEvent } from "react";

import { ROUTES } from "@/lib/constants";
import { isPlainLeftClick, isSameOrigin } from "@/lib/utils";

export function BackLink() {
  const router = useRouter();

  function handleClick(event: MouseEvent<HTMLAnchorElement>) {
    if (!isPlainLeftClick(event)) return;

    // Only use history.back() if the previous page was on this site.
    if (isSameOrigin(document.referrer) && window.history.length > 1) {
      event.preventDefault();
      router.back();
    }
  }

  return (
    <Link
      href={ROUTES.home}
      onClick={handleClick}
      className="flex items-center gap-2 font-body text-sm text-j-text-muted hover:text-j-text-gold transition-colors"
    >
      <ArrowLeft className="w-4 h-4" />
      Back
    </Link>
  );
}
