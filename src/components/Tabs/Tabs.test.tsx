import { fireEvent, render, screen } from "@testing-library/react";
import { useState } from "react";
import { describe, expect, it, vi } from "vitest";

import { TabPanel } from "./TabPanel";
import { tabControlId, tabPanelId, Tabs } from "./Tabs";

type Harness = {
  initial?: string;
  onChangeSpy?: (id: string) => void;
};

function TabsHarness({ initial = "readings", onChangeSpy }: Harness) {
  const [active, setActive] = useState(initial);
  return (
    <div>
      <Tabs
        tabs={[
          { id: "readings", label: "Readings", count: 3 },
          { id: "gifts", label: "Gifts", count: 0 },
        ]}
        activeTabId={active}
        onChange={(next) => {
          setActive(next);
          onChangeSpy?.(next);
        }}
        label="Your library"
      />
      <TabPanel tabId="readings" isActive={active === "readings"}>
        readings content
      </TabPanel>
      <TabPanel tabId="gifts" isActive={active === "gifts"}>
        gifts content
      </TabPanel>
    </div>
  );
}

describe("Tabs", () => {
  it("renders tablist + tab + tabpanel roles with correct ARIA wiring", () => {
    render(<TabsHarness />);
    expect(screen.getByRole("tablist", { name: "Your library" })).toBeInTheDocument();
    const readingsTab = screen.getByRole("tab", { name: /Readings/ });
    const giftsTab = screen.getByRole("tab", { name: /Gifts/ });
    expect(readingsTab).toHaveAttribute("aria-selected", "true");
    expect(giftsTab).toHaveAttribute("aria-selected", "false");
    expect(readingsTab).toHaveAttribute("aria-controls", tabPanelId("readings"));
    expect(readingsTab).toHaveAttribute("id", tabControlId("readings"));
    expect(readingsTab).toHaveAttribute("tabindex", "0");
    expect(giftsTab).toHaveAttribute("tabindex", "-1");

    const activePanel = screen.getByRole("tabpanel");
    expect(activePanel).toHaveAttribute("aria-labelledby", tabControlId("readings"));
    expect(activePanel).toHaveTextContent("readings content");
  });

  it("updates aria-selected when the active tab changes via click", () => {
    const spy = vi.fn();
    render(<TabsHarness onChangeSpy={spy} />);
    const giftsTab = screen.getByRole("tab", { name: /Gifts/ });
    fireEvent.click(giftsTab);
    expect(spy).toHaveBeenCalledWith("gifts");
    expect(giftsTab).toHaveAttribute("aria-selected", "true");
    expect(screen.getByRole("tab", { name: /Readings/ })).toHaveAttribute(
      "aria-selected",
      "false",
    );
  });

  it("renders count badge for non-undefined counts including 0", () => {
    render(<TabsHarness />);
    const readingsTab = screen.getByRole("tab", { name: /Readings/ });
    const giftsTab = screen.getByRole("tab", { name: /Gifts/ });
    expect(readingsTab.textContent).toContain("3");
    expect(giftsTab.textContent).toContain("0");
  });

  it("omits the count badge when count is undefined", () => {
    function NoCountHarness() {
      const [active, setActive] = useState("readings");
      return (
        <Tabs
          tabs={[
            { id: "readings", label: "Readings" },
            { id: "gifts", label: "Gifts" },
          ]}
          activeTabId={active}
          onChange={setActive}
        />
      );
    }
    render(<NoCountHarness />);
    const readingsTab = screen.getByRole("tab", { name: "Readings" });
    expect(readingsTab.textContent).toBe("Readings");
  });

  it("ArrowRight cycles activeTabId forward and wraps", () => {
    render(<TabsHarness />);
    const tablist = screen.getByRole("tablist");
    fireEvent.keyDown(tablist, { key: "ArrowRight" });
    expect(screen.getByRole("tab", { name: /Gifts/ })).toHaveAttribute(
      "aria-selected",
      "true",
    );
    fireEvent.keyDown(tablist, { key: "ArrowRight" });
    expect(screen.getByRole("tab", { name: /Readings/ })).toHaveAttribute(
      "aria-selected",
      "true",
    );
  });

  it("ArrowLeft cycles activeTabId backward and wraps", () => {
    render(<TabsHarness />);
    const tablist = screen.getByRole("tablist");
    fireEvent.keyDown(tablist, { key: "ArrowLeft" });
    expect(screen.getByRole("tab", { name: /Gifts/ })).toHaveAttribute(
      "aria-selected",
      "true",
    );
  });

  it("Home jumps to the first tab", () => {
    render(<TabsHarness initial="gifts" />);
    const tablist = screen.getByRole("tablist");
    fireEvent.keyDown(tablist, { key: "Home" });
    expect(screen.getByRole("tab", { name: /Readings/ })).toHaveAttribute(
      "aria-selected",
      "true",
    );
  });

  it("End jumps to the last tab", () => {
    render(<TabsHarness initial="readings" />);
    const tablist = screen.getByRole("tablist");
    fireEvent.keyDown(tablist, { key: "End" });
    expect(screen.getByRole("tab", { name: /Gifts/ })).toHaveAttribute(
      "aria-selected",
      "true",
    );
  });

  it("inactive panel is hidden via the hidden attribute", () => {
    render(<TabsHarness />);
    const panels = document.querySelectorAll('[role="tabpanel"]');
    expect(panels).toHaveLength(2);
    const readingsPanel = document.getElementById(tabPanelId("readings"));
    const giftsPanel = document.getElementById(tabPanelId("gifts"));
    expect(readingsPanel?.hidden).toBe(false);
    expect(giftsPanel?.hidden).toBe(true);
  });
});
