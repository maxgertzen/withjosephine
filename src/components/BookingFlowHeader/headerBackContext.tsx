"use client";

import { createContext, type ReactNode, useCallback, useContext, useMemo, useState } from "react";

type HeaderBackContextValue = {
  onBack: (() => void) | null;
  setOnBack: (handler: (() => void) | null) => void;
};

const HeaderBackContext = createContext<HeaderBackContextValue>({
  onBack: null,
  setOnBack: () => {},
});

export function HeaderBackProvider({ children }: { children: ReactNode }) {
  const [onBack, setOnBackState] = useState<(() => void) | null>(null);
  // Wrap so callers pass the handler directly; the functional form keeps React
  // from invoking the handler as a state updater.
  const setOnBack = useCallback(
    (handler: (() => void) | null) => setOnBackState(() => handler),
    [],
  );
  const value = useMemo(() => ({ onBack, setOnBack }), [onBack, setOnBack]);
  return <HeaderBackContext.Provider value={value}>{children}</HeaderBackContext.Provider>;
}

export function useHeaderBack(): HeaderBackContextValue {
  return useContext(HeaderBackContext);
}
