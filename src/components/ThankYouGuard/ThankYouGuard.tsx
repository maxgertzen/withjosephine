"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

function isOnLinkOrButton(target: EventTarget | null): boolean {
  return target instanceof Element && target.closest("a, button") !== null;
}

export function ThankYouGuard() {
  const { replace } = useRouter();

  useEffect(() => {
    const mounted = new AbortController();
    const firstInteraction = new AbortController();
    const goHomeOnBack = () => replace("/");
    const addHomeStep = (event: Event) => {
      if (isOnLinkOrButton(event.target)) return;
      firstInteraction.abort();
      window.history.scrollRestoration = "manual";
      window.history.pushState(null, "", window.location.href);
      window.addEventListener("popstate", goHomeOnBack, { signal: mounted.signal });
    };

    window.addEventListener("click", addHomeStep, { signal: firstInteraction.signal });
    window.addEventListener("keydown", addHomeStep, { signal: firstInteraction.signal });
    return () => {
      firstInteraction.abort();
      mounted.abort();
    };
  }, [replace]);

  return null;
}
