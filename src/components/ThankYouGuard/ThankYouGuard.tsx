"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";

export function ThankYouGuard() {
  const pathname = usePathname();
  const previewMode = pathname?.startsWith("/preview") ?? false;

  useEffect(() => {
    if (previewMode) return;

    window.history.replaceState(null, "", window.location.href);

    const handlePopState = () => {
      window.location.href = "/";
    };

    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, [previewMode]);

  return null;
}
