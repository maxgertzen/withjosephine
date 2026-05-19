import { fireEvent, render, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { MY_GIFTS_PAGE_DEFAULTS } from "@/data/defaults";

import { ConfirmArmedButton } from "../ConfirmArmedButton";

const refreshMock = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: refreshMock, push: vi.fn(), replace: vi.fn() }),
}));

const baseLabels = {
  idle: "Send now",
  confirm: "Tap again to confirm",
  sending: "Sending…",
};

describe("ConfirmArmedButton", () => {
  beforeEach(() => {
    refreshMock.mockReset();
    vi.unstubAllGlobals();
  });

  it("requires two taps before firing the POST", () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );
    vi.stubGlobal("fetch", fetchMock);

    const { getByRole } = render(
      <ConfirmArmedButton
        endpoint="/api/gifts/g1/send-now"
        copy={MY_GIFTS_PAGE_DEFAULTS}
        labels={baseLabels}
      />,
    );

    fireEvent.click(getByRole("button", { name: baseLabels.idle }));
    expect(fetchMock).not.toHaveBeenCalled();
    fireEvent.click(getByRole("button", { name: baseLabels.confirm }));
    expect(fetchMock).toHaveBeenCalledOnce();
    expect(fetchMock.mock.calls[0][0]).toBe("/api/gifts/g1/send-now");
  });

  it("refreshes the router on success", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ ok: true }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }),
      ),
    );
    const { getByRole } = render(
      <ConfirmArmedButton
        endpoint="/api/gifts/g1/send-now"
        copy={MY_GIFTS_PAGE_DEFAULTS}
        labels={baseLabels}
      />,
    );
    fireEvent.click(getByRole("button", { name: baseLabels.idle }));
    fireEvent.click(getByRole("button", { name: baseLabels.confirm }));
    await waitFor(() => expect(refreshMock).toHaveBeenCalled());
  });

  it("invokes onSuccess instead of router.refresh when provided", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ ok: true }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }),
      ),
    );
    const onSuccess = vi.fn();
    const { getByRole } = render(
      <ConfirmArmedButton
        endpoint="/api/gifts/g1/send-now"
        copy={MY_GIFTS_PAGE_DEFAULTS}
        labels={baseLabels}
        onSuccess={onSuccess}
      />,
    );
    fireEvent.click(getByRole("button", { name: baseLabels.idle }));
    fireEvent.click(getByRole("button", { name: baseLabels.confirm }));
    await waitFor(() => expect(onSuccess).toHaveBeenCalled());
    expect(refreshMock).not.toHaveBeenCalled();
  });

  it("disarms on http_409 (R-1: any non-success disarms)", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ error: "Already cancelled" }), {
          status: 409,
          headers: { "Content-Type": "application/json" },
        }),
      ),
    );
    const { getByRole, queryByRole } = render(
      <ConfirmArmedButton
        endpoint="/api/gifts/g1/cancel-scheduled"
        copy={MY_GIFTS_PAGE_DEFAULTS}
        labels={baseLabels}
        errorOverrides={{ http_409: "actionClosedError" }}
      />,
    );
    fireEvent.click(getByRole("button", { name: baseLabels.idle }));
    fireEvent.click(getByRole("button", { name: baseLabels.confirm }));
    // After the 409 resolves, the button must return to idle so the user
    // isn't stuck in an "armed forever" state.
    await waitFor(() => {
      expect(queryByRole("button", { name: baseLabels.confirm })).toBeNull();
    });
    expect(getByRole("button", { name: baseLabels.idle })).toBeTruthy();
    expect(refreshMock).not.toHaveBeenCalled();
  });

  it("disarms on http_401 + maps to sessionExpired override", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ error: "Unauthorized" }), {
          status: 401,
          headers: { "Content-Type": "application/json" },
        }),
      ),
    );
    const { getByRole, getByText } = render(
      <ConfirmArmedButton
        endpoint="/api/gifts/g1/send-now"
        copy={MY_GIFTS_PAGE_DEFAULTS}
        labels={baseLabels}
        errorOverrides={{ http_401: "sendNowSessionExpiredError" }}
      />,
    );
    fireEvent.click(getByRole("button", { name: baseLabels.idle }));
    fireEvent.click(getByRole("button", { name: baseLabels.confirm }));
    await waitFor(() => {
      expect(getByText(MY_GIFTS_PAGE_DEFAULTS.sendNowSessionExpiredError)).toBeTruthy();
    });
    expect(getByRole("button", { name: baseLabels.idle })).toBeTruthy();
  });

  it("renders destructive variant when variant='destructive'", () => {
    const { getByRole } = render(
      <ConfirmArmedButton
        endpoint="/api/gifts/g1/cancel-scheduled"
        copy={MY_GIFTS_PAGE_DEFAULTS}
        labels={baseLabels}
        variant="destructive"
      />,
    );
    fireEvent.click(getByRole("button", { name: baseLabels.idle }));
    const confirmButton = getByRole("button", { name: baseLabels.confirm });
    // Destructive variant uses the j-rose token; idle uses outlined.
    expect(confirmButton.className).toContain("bg-j-rose");
  });
});
