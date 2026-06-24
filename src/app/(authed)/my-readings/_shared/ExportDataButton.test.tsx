import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { MY_READINGS_PAGE_DEFAULTS } from "@/data/defaults";

import { ExportDataButton } from "./ExportDataButton";

const fetchMock = vi.fn();

beforeEach(() => {
  fetchMock.mockReset();
  vi.stubGlobal("fetch", fetchMock);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

function clickExport() {
  fireEvent.click(
    screen.getByRole("button", { name: MY_READINGS_PAGE_DEFAULTS.exportButtonLabel }),
  );
}

describe("ExportDataButton", () => {
  it("POSTs to the export endpoint and shows the success message on 202", async () => {
    fetchMock.mockResolvedValue(
      new Response(JSON.stringify({ submissionCount: 2, expiresInSeconds: 604800 }), {
        status: 202,
      }),
    );
    render(<ExportDataButton copy={MY_READINGS_PAGE_DEFAULTS} />);

    clickExport();

    await waitFor(() =>
      expect(
        screen.getByText(MY_READINGS_PAGE_DEFAULTS.exportSuccessMessage!),
      ).toBeInTheDocument(),
    );
    expect(fetchMock).toHaveBeenCalledWith("/api/privacy/export", { method: "POST" });
  });

  it("surfaces the server's message on a 429 throttle", async () => {
    const throttleMessage = "Export already requested recently. Please check your email.";
    fetchMock.mockResolvedValue(
      new Response(JSON.stringify({ error: throttleMessage }), { status: 429 }),
    );
    render(<ExportDataButton copy={MY_READINGS_PAGE_DEFAULTS} />);

    clickExport();

    await waitFor(() => expect(screen.getByText(throttleMessage)).toBeInTheDocument());
  });

  it("falls back to the generic error message when the response has no error body", async () => {
    fetchMock.mockResolvedValue(new Response(null, { status: 403 }));
    render(<ExportDataButton copy={MY_READINGS_PAGE_DEFAULTS} />);

    clickExport();

    await waitFor(() =>
      expect(
        screen.getByText(MY_READINGS_PAGE_DEFAULTS.exportErrorMessage!),
      ).toBeInTheDocument(),
    );
  });
});
