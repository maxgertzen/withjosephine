"use client";

import type { ReactNode } from "react";
import { createPortal } from "react-dom";

import { useIsClient } from "@/lib/hooks/useIsClient";

export function BodyPortal({ children }: { children: ReactNode }) {
  const isClient = useIsClient();
  return isClient ? createPortal(children, document.body) : null;
}
