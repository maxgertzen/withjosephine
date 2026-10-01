import { useState, useSyncExternalStore } from "react";

const noopSubscribe = () => () => {};
const nothingOnServer = () => null;

function onceOnly<T>(read: () => T): () => T {
  let hasRead = false;
  let value: T;
  return () => {
    if (!hasRead) {
      value = read();
      hasRead = true;
    }
    return value;
  };
}

export function useFirstClientRead<T>(read: () => T): T | null {
  const [readOnce] = useState(() => onceOnly(read));
  return useSyncExternalStore(noopSubscribe, readOnce, nothingOnServer);
}
