export function withLocalStorage<T>(run: (storage: Storage) => T, fallback: T): T {
  try {
    return run(window.localStorage);
  } catch {
    return fallback;
  }
}
