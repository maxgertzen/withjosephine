import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { type RefObject, useRef } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const trackMock = vi.fn();
vi.mock("@/lib/analytics", () => ({
  track: (...args: unknown[]) => trackMock(...args),
}));

import { useFieldFocusTelemetry } from "./useFieldFocusTelemetry";

function Harness({
  readingId,
  currentPage,
  externalRef,
}: {
  readingId: string;
  currentPage: number;
  externalRef?: RefObject<HTMLFormElement | null>;
}) {
  const internalRef = useRef<HTMLFormElement | null>(null);
  const formRef = externalRef ?? internalRef;
  useFieldFocusTelemetry({ formRef, readingId, currentPage });
  return (
    <form ref={formRef}>
      <input id="field-fullName" data-testid="fullName" />
      <input id="field-email" data-testid="email" />
      <input id="not-a-field" data-testid="noise" />
    </form>
  );
}

beforeEach(() => {
  trackMock.mockReset();
});

afterEach(() => {
  trackMock.mockReset();
});

describe("useFieldFocusTelemetry", () => {
  it("fires intake_field_first_focus once per field key", async () => {
    render(<Harness readingId="soul-blueprint" currentPage={0} />);
    const user = userEvent.setup();
    await user.click(screen.getByTestId("fullName"));
    await user.click(screen.getByTestId("email"));
    await user.click(screen.getByTestId("fullName"));
    expect(trackMock).toHaveBeenCalledTimes(2);
    expect(trackMock).toHaveBeenNthCalledWith(1, "intake_field_first_focus", {
      reading_id: "soul-blueprint",
      field_key: "fullName",
      page_number: 1,
    });
    expect(trackMock).toHaveBeenNthCalledWith(2, "intake_field_first_focus", {
      reading_id: "soul-blueprint",
      field_key: "email",
      page_number: 1,
    });
  });

  it("ignores focus on elements without a field- id prefix", async () => {
    render(<Harness readingId="soul-blueprint" currentPage={0} />);
    const user = userEvent.setup();
    await user.click(screen.getByTestId("noise"));
    expect(trackMock).not.toHaveBeenCalled();
  });

  it("reports the current page number at focus time", async () => {
    const { rerender } = render(
      <Harness readingId="soul-blueprint" currentPage={2} />,
    );
    const user = userEvent.setup();
    await user.click(screen.getByTestId("fullName"));
    expect(trackMock).toHaveBeenCalledWith("intake_field_first_focus", {
      reading_id: "soul-blueprint",
      field_key: "fullName",
      page_number: 3,
    });

    rerender(<Harness readingId="soul-blueprint" currentPage={5} />);
    await user.click(screen.getByTestId("email"));
    expect(trackMock).toHaveBeenLastCalledWith("intake_field_first_focus", {
      reading_id: "soul-blueprint",
      field_key: "email",
      page_number: 6,
    });
  });
});
