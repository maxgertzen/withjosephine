import { vi } from "vitest";

export function stubNavigationHistory(urls: string[], currentIndex = urls.length - 1) {
  const entries = urls.map((url, index) => ({
    url: new URL(url, window.location.origin).href,
    index,
    key: `entry-${index}`,
  }));
  const traverseTo = vi.fn();
  vi.stubGlobal("navigation", {
    currentEntry: entries[currentIndex],
    entries: () => entries,
    traverseTo,
    addEventListener: () => {},
    removeEventListener: () => {},
  });
  window.history.replaceState(null, "", entries[currentIndex].url);
  return { traverseTo };
}
