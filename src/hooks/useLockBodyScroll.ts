import { useEffect } from "react";

// Measuring the real width the browser reclaims when the scrollbar is removed
// (not a fixed scrollbar-gutter, which failed for classic scrollbars in #303):
// overlay scrollbars yield 0, classic scrollbars yield their width to offset.
export function useLockBodyScroll(locked: boolean) {
  useEffect(() => {
    if (!locked) return;
    const html = document.documentElement;
    const widthBeforeLock = html.clientWidth;
    html.style.overflow = "hidden";
    const gutter = html.clientWidth - widthBeforeLock;
    if (gutter > 0) {
      html.style.paddingRight = `${gutter}px`;
      html.style.setProperty("--j-scroll-lock-gutter", `${gutter}px`);
    }
    return () => {
      html.style.overflow = "";
      html.style.paddingRight = "";
      html.style.removeProperty("--j-scroll-lock-gutter");
    };
  }, [locked]);
}
