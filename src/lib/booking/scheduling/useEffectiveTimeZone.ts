"use client";

import { useState } from "react";

import { useFirstClientRead } from "@/lib/hooks/useFirstClientRead";

import { resolveBrowserTimeZone } from "./timezone";

export function useEffectiveTimeZone() {
  const browserTz = useFirstClientRead(resolveBrowserTimeZone);
  const [pickedTz, setPickedTz] = useState<string | null>(null);

  return {
    browserTz,
    pickedTz,
    setPickedTz,
    effectiveTz: browserTz ?? pickedTz,
    requiresPicker: browserTz === null,
  };
}
