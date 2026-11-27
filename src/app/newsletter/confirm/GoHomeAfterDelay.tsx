"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

import { ROUTES } from "@/lib/constants";

export const GO_HOME_DELAY_MS = 4000;

export function GoHomeAfterDelay() {
  const { replace } = useRouter();

  useEffect(() => {
    const handle = setTimeout(() => replace(ROUTES.home), GO_HOME_DELAY_MS);
    return () => clearTimeout(handle);
  }, [replace]);

  return null;
}
