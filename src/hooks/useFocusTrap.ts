import { type RefObject, useEffect, useEffectEvent } from "react";

const FOCUSABLE_SELECTOR =
  'a[href], button:not([disabled]), input:not([disabled]):not([tabindex="-1"]), textarea:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

type FocusTrapOptions = {
  active: boolean;
  containerRef: RefObject<HTMLElement | null>;
  onEscape: () => void;
  extraFocusables?: RefObject<HTMLElement | null>[];
  initialFocus?: "container" | "firstFocusable";
  returnFocusRef?: RefObject<HTMLElement | null>;
};

function focusablesWithin(container: HTMLElement): HTMLElement[] {
  return Array.from(container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR));
}

export function useFocusTrap({
  active,
  containerRef,
  onEscape,
  extraFocusables = [],
  initialFocus = "container",
  returnFocusRef,
}: FocusTrapOptions) {
  const escape = useEffectEvent(onEscape);
  const trappedFocusables = useEffectEvent((container: HTMLElement) => [
    ...extraFocusables.flatMap((ref) => (ref.current ? [ref.current] : [])),
    ...focusablesWithin(container),
  ]);
  const returnFocusTarget = useEffectEvent(() => returnFocusRef?.current ?? null);

  useEffect(() => {
    if (!active) return;
    const container = containerRef.current;
    const opener = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    if (initialFocus === "container") container?.focus();
    else if (container) focusablesWithin(container)[0]?.focus();

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        escape();
        return;
      }
      if (event.key !== "Tab" || !container) return;
      const focusable = trappedFocusables(container);
      if (focusable.length === 0) {
        event.preventDefault();
        return;
      }
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      const activeElement = document.activeElement;
      if (event.shiftKey && (activeElement === first || activeElement === container)) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && (activeElement === last || activeElement === container)) {
        event.preventDefault();
        first.focus();
      }
    };

    const returnTarget = returnFocusTarget() ?? opener;
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      returnTarget?.focus();
    };
  }, [active, containerRef, initialFocus]);
}
