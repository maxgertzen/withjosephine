export type BrowserStorageKind = "localStorage" | "sessionStorage";

export function withStorage<T>(
  kind: BrowserStorageKind,
  run: (storage: Storage) => T,
  fallback: T,
): T {
  try {
    return run(window[kind]);
  } catch {
    return fallback;
  }
}
