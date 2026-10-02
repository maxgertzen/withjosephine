import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { READING_PAGE_DEFAULTS } from "@/data/defaults";

import { FactsRow } from "./FactsRow";

const LAYOUT = {
  factsPerRowPhone: 3,
  factsPerRowDesktop: 4,
  factsBalanceRows: true,
  factsListOnPhones: false,
};
const FIVE_FACTS = ["Format", "Length", "Arrives", "Reader", "Language"].map((label) => ({
  label,
  value: `${label} value`,
}));

describe("FactsRow", () => {
  it("renders nothing when there are no facts", () => {
    const { container } = render(<FactsRow facts={[]} layout={LAYOUT} />);
    expect(container).toBeEmptyDOMElement();
  });

  it("renders one row set when phones and computers split the same way", () => {
    const { container } = render(<FactsRow facts={READING_PAGE_DEFAULTS.facts} layout={LAYOUT} />);
    expect(container.querySelectorAll("dl")).toHaveLength(1);
    expect(screen.getAllByText("Format")).toHaveLength(1);
  });

  it("splits 5 facts into rows of 3 and 2 on phones and on computers", () => {
    const { container } = render(<FactsRow facts={FIVE_FACTS} layout={LAYOUT} />);
    const rowSizes = Array.from(container.querySelectorAll("dl"), (row) => row.children.length);
    expect(rowSizes).toEqual([3, 2]);
  });

  it("gives phones a list and computers the rows when the list switch is on", () => {
    const { container } = render(
      <FactsRow facts={FIVE_FACTS} layout={{ ...LAYOUT, factsListOnPhones: true }} />,
    );
    const [phoneList, ...desktopRows] = Array.from(container.querySelectorAll("dl"));
    expect(phoneList).toHaveClass("md:hidden");
    expect(phoneList.children).toHaveLength(5);
    expect(desktopRows.map((row) => row.children.length)).toEqual([3, 2]);
  });
});
