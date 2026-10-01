import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function mergeClasses(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export { default as escapeHtml } from "escape-html";

export function isSameOrigin(url: string): boolean {
  try {
    return new URL(url).origin === window.location.origin;
  } catch {
    return false;
  }
}

export function isPlainLeftClick(
  event: Pick<MouseEvent, "defaultPrevented" | "button" | "metaKey" | "ctrlKey" | "shiftKey" | "altKey">,
): boolean {
  return (
    !event.defaultPrevented &&
    event.button === 0 &&
    !event.metaKey &&
    !event.ctrlKey &&
    !event.shiftKey &&
    !event.altKey
  );
}
