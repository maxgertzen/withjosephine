"use client";

import { createContext, type ReactNode, useCallback, useContext, useMemo, useState } from "react";

type GiftModeContextValue = {
  active: boolean;
  draftRestored: boolean;
  endGiftMode: () => void;
  setDraftRestored: (restored: boolean) => void;
};

const GiftModeContext = createContext<GiftModeContextValue>({
  active: false,
  draftRestored: false,
  endGiftMode: () => {},
  setDraftRestored: () => {},
});

export function GiftModeProvider({ children }: { children: ReactNode }) {
  const [active, setActive] = useState(true);
  const [draftRestored, setDraftRestored] = useState(false);
  const endGiftMode = useCallback(() => setActive(false), []);
  const value = useMemo(
    () => ({ active, draftRestored, endGiftMode, setDraftRestored }),
    [active, draftRestored, endGiftMode],
  );
  return <GiftModeContext.Provider value={value}>{children}</GiftModeContext.Provider>;
}

export function useGiftMode(): GiftModeContextValue {
  return useContext(GiftModeContext);
}
