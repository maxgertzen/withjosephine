"use client";

import { usePathname } from "next/navigation";
import { useSyncExternalStore } from "react";

import { leavePreviewHref, previewActiveFromCookie } from "@/lib/previewModeCookie";
import { PREVIEW_ROOT } from "@/lib/previewPath";
import { LAYER } from "@/styles/layers";

function previewActiveOutsideStudio(): boolean {
  return previewActiveFromCookie(document.cookie) && window.self === window.top;
}

function isPreviewRoute(pathname: string): boolean {
  return pathname === PREVIEW_ROOT || pathname.startsWith(`${PREVIEW_ROOT}/`);
}

export function PreviewModeNotice() {
  const pathname = usePathname() ?? "/";
  const previewActive = useSyncExternalStore(
    () => () => {},
    previewActiveOutsideStudio,
    () => false,
  );

  if (!previewActive || isPreviewRoute(pathname)) return null;

  return (
    <div
      role="status"
      className={`fixed bottom-4 left-1/2 ${LAYER.previewNotice} flex w-[calc(100%-2rem)] max-w-md -translate-x-1/2 items-center gap-3 rounded-[16px] border border-j-border-subtle bg-j-ivory px-4 py-3 font-body text-sm text-j-text shadow-j-soft`}
    >
      <span className="flex-1">
        Sanity preview is on in this browser. Bookings and payments use the published site.
      </span>
      <a
        href={leavePreviewHref(`${pathname}${window.location.search}${window.location.hash}`)}
        className="shrink-0 rounded-full bg-j-deep px-4 py-1.5 text-j-cream"
      >
        Leave preview
      </a>
    </div>
  );
}
