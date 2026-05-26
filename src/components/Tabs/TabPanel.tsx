import type { ReactNode } from "react";

import { tabControlId, tabPanelId } from "./Tabs";

/**
 * Companion to `Tabs`. Wraps content in a `role="tabpanel"` element with the
 * correct ARIA wiring (`id` matches `aria-controls` from the tab; the panel's
 * `aria-labelledby` points back at the tab's `id`).
 *
 * `hidden` is the DOM attribute (not `display: none` via Tailwind) so screen
 * readers consistently skip inactive panels and the panel is removed from the
 * keyboard tab order when inactive.
 */
export type TabPanelProps = {
  tabId: string;
  isActive: boolean;
  children: ReactNode;
  className?: string;
};

export function TabPanel({ tabId, isActive, children, className }: TabPanelProps) {
  return (
    <div
      role="tabpanel"
      id={tabPanelId(tabId)}
      aria-labelledby={tabControlId(tabId)}
      tabIndex={0}
      hidden={!isActive}
      className={className}
    >
      {children}
    </div>
  );
}
