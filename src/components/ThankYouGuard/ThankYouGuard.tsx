"use client";

import { useEffect } from "react";

export function ThankYouGuard() {
  useEffect(() => {
    window.history.replaceState(null, "", window.location.href);

    const handlePopState = () => {
      window.location.href = "/";
    };

    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  return null;
}
