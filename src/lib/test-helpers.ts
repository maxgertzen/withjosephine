import { vi } from "vitest";

function refuse(): never {
  throw new Error("SecurityError");
}

const BLOCKED_STORAGE = {
  length: 1,
  key: refuse,
  getItem: refuse,
  setItem: refuse,
  removeItem: refuse,
} as unknown as Storage;

export function blockBrowserStorage() {
  vi.spyOn(window, "localStorage", "get").mockReturnValue(BLOCKED_STORAGE);
  vi.spyOn(window, "sessionStorage", "get").mockReturnValue(BLOCKED_STORAGE);
}

export function blockBrowserStorageProperty() {
  vi.spyOn(window, "localStorage", "get").mockImplementation(refuse);
  vi.spyOn(window, "sessionStorage", "get").mockImplementation(refuse);
}
