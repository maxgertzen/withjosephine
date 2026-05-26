"use client";

import { type KeyboardEvent, useRef } from "react";

/**
 * Semantic ARIA tab strip. Hand-rolled to avoid the dep cost of a tab
 * library; matches the WAI-ARIA Tabs pattern (manual activation, since the
 * orchestrator's router push is the side effect of selection):
 *
 *   - Container: role="tablist"
 *   - Each control: role="tab", aria-selected, aria-controls={panelId},
 *     tabIndex 0 only on the active tab (roving tabindex)
 *   - ArrowLeft/Right: cycle activation through tabs (wraps)
 *   - Home / End: jump to first / last
 *
 * Pair with `TabPanel` for the panel side. Both use the convention
 * `tab-${id}` for the tab control id and `panel-${id}` for the panel id so
 * a11y wiring is consistent without prop drilling.
 */

export type TabDescriptor = {
  id: string;
  label: string;
  count?: number;
};

export type TabsProps = {
  tabs: ReadonlyArray<TabDescriptor>;
  activeTabId: string;
  onChange: (id: string) => void;
  label?: string;
  className?: string;
};

export function tabControlId(id: string): string {
  return `tab-${id}`;
}

export function tabPanelId(id: string): string {
  return `panel-${id}`;
}

export function Tabs({ tabs, activeTabId, onChange, label, className }: TabsProps) {
  const buttonRefs = useRef<Array<HTMLButtonElement | null>>([]);

  function selectAndFocus(nextIndex: number) {
    const next = tabs[nextIndex];
    if (!next) return;
    onChange(next.id);
    const node = buttonRefs.current[nextIndex];
    if (node) node.focus();
  }

  function handleKey(event: KeyboardEvent<HTMLDivElement>) {
    const currentIndex = tabs.findIndex((tab) => tab.id === activeTabId);
    if (currentIndex === -1) return;
    if (event.key === "ArrowRight") {
      event.preventDefault();
      selectAndFocus((currentIndex + 1) % tabs.length);
    } else if (event.key === "ArrowLeft") {
      event.preventDefault();
      selectAndFocus((currentIndex - 1 + tabs.length) % tabs.length);
    } else if (event.key === "Home") {
      event.preventDefault();
      selectAndFocus(0);
    } else if (event.key === "End") {
      event.preventDefault();
      selectAndFocus(tabs.length - 1);
    }
  }

  return (
    <div
      role="tablist"
      aria-label={label}
      onKeyDown={handleKey}
      className={[
        "flex gap-8 border-b border-j-blush justify-center",
        className ?? "",
      ]
        .filter(Boolean)
        .join(" ")}
    >
      {tabs.map((tab, index) => {
        const isActive = tab.id === activeTabId;
        return (
          <button
            key={tab.id}
            ref={(node) => {
              buttonRefs.current[index] = node;
            }}
            type="button"
            role="tab"
            id={tabControlId(tab.id)}
            aria-selected={isActive}
            aria-controls={tabPanelId(tab.id)}
            tabIndex={isActive ? 0 : -1}
            onClick={() => onChange(tab.id)}
            className={[
              "font-display italic text-lg pb-3 -mb-px transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-j-gold focus-visible:rounded-sm",
              isActive
                ? "text-j-gold border-b-2 border-j-gold"
                : "text-j-text-muted hover:text-j-text-heading border-b-2 border-transparent",
            ].join(" ")}
          >
            <span>{tab.label}</span>
            {tab.count !== undefined ? (
              <span
                className={[
                  "ml-2 font-body text-sm",
                  isActive ? "text-j-gold" : "text-j-text-muted",
                ].join(" ")}
                aria-hidden="true"
              >
                {tab.count}
              </span>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}
