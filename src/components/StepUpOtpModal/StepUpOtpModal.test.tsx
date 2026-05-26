import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { StepUpOtpModal } from "./StepUpOtpModal";

const originalFetch = globalThis.fetch;
const fetchMock = vi.fn();

vi.mock("next/link", () => ({
  default: ({ children, href, ...props }: Record<string, unknown>) => (
    <a href={href as string} {...props}>
      {children as React.ReactNode}
    </a>
  ),
  useLinkStatus: () => ({ pending: false }),
}));

function jsonResponse(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

beforeEach(() => {
  fetchMock.mockReset();
  globalThis.fetch = fetchMock as unknown as typeof globalThis.fetch;
});

afterEach(() => {
  globalThis.fetch = originalFetch;
});

describe("StepUpOtpModal", () => {
  it("does not render when closed", () => {
    render(
      <StepUpOtpModal open={false} onClose={vi.fn()} onElevated={vi.fn()} />,
    );
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("renders dialog with role + aria-modal + aria-labelledby when opened", async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({}, 200));
    render(
      <StepUpOtpModal open={true} onClose={vi.fn()} onElevated={vi.fn()} />,
    );
    const dialog = await screen.findByRole("dialog");
    expect(dialog).toHaveAttribute("aria-modal", "true");
    expect(dialog).toHaveAttribute("aria-labelledby");
    expect(
      screen.getByRole("heading", { name: "Quick verification" }),
    ).toBeInTheDocument();
  });

  it("posts to /api/auth/step-up/request on open and shows the code input", async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({}, 200));
    render(
      <StepUpOtpModal open={true} onClose={vi.fn()} onElevated={vi.fn()} />,
    );
    await screen.findByLabelText("6 digit code");
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/auth/step-up/request",
      expect.objectContaining({ method: "POST" }),
    );
  });

  it("input carries inputmode numeric, pattern, autocomplete, maxLength", async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({}, 200));
    render(
      <StepUpOtpModal open={true} onClose={vi.fn()} onElevated={vi.fn()} />,
    );
    const input = (await screen.findByLabelText("6 digit code")) as HTMLInputElement;
    expect(input.getAttribute("inputmode")).toBe("numeric");
    expect(input.getAttribute("pattern")).toBe("[0-9]*");
    expect(input.getAttribute("autocomplete")).toBe("one-time-code");
    expect(input.maxLength).toBe(6);
  });

  it("rejects non-numeric input", async () => {
    const user = userEvent.setup();
    fetchMock.mockResolvedValueOnce(jsonResponse({}, 200));
    render(
      <StepUpOtpModal open={true} onClose={vi.fn()} onElevated={vi.fn()} />,
    );
    const input = (await screen.findByLabelText("6 digit code")) as HTMLInputElement;
    await user.type(input, "abc123");
    expect(input.value).toBe("123");
  });

  it("disables submit until exactly 6 digits entered", async () => {
    const user = userEvent.setup();
    fetchMock.mockResolvedValueOnce(jsonResponse({}, 200));
    render(
      <StepUpOtpModal open={true} onClose={vi.fn()} onElevated={vi.fn()} />,
    );
    const input = await screen.findByLabelText("6 digit code");
    const submit = screen.getByRole("button", { name: "Verify" });
    expect(submit).toBeDisabled();
    await user.type(input, "12345");
    expect(submit).toBeDisabled();
    await user.type(input, "6");
    expect(submit).not.toBeDisabled();
  });

  it("calls onElevated and onClose on successful verify", async () => {
    const user = userEvent.setup();
    const onElevated = vi.fn();
    const onClose = vi.fn();
    fetchMock
      .mockResolvedValueOnce(jsonResponse({}, 200))
      .mockResolvedValueOnce(jsonResponse({ elevatedAt: 1700000000 }, 200));
    render(
      <StepUpOtpModal open={true} onClose={onClose} onElevated={onElevated} />,
    );
    const input = await screen.findByLabelText("6 digit code");
    await user.type(input, "123456");
    await user.click(screen.getByRole("button", { name: "Verify" }));
    await waitFor(() => expect(onElevated).toHaveBeenCalled());
    expect(onClose).toHaveBeenCalled();
    expect(fetchMock).toHaveBeenLastCalledWith(
      "/api/auth/step-up/verify",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ code: "123456" }),
      }),
    );
  });

  it("surfaces mismatch copy + contact link on 422", async () => {
    const user = userEvent.setup();
    fetchMock
      .mockResolvedValueOnce(jsonResponse({}, 200))
      .mockResolvedValueOnce(
        jsonResponse(
          { reason: "mismatch", error: "step_up_failed" },
          422,
        ),
      );
    render(
      <StepUpOtpModal
        open={true}
        onClose={vi.fn()}
        onElevated={vi.fn()}
        contactMailto="mailto:help@withjosephine.com?subject=Step-up"
      />,
    );
    const input = await screen.findByLabelText("6 digit code");
    await user.type(input, "111111");
    await user.click(screen.getByRole("button", { name: "Verify" }));
    const errBlock = await screen.findByTestId("step-up-verify-error");
    expect(errBlock).toHaveTextContent("That code did not match");
    const link = screen.getByTestId("step-up-contact-link") as HTMLAnchorElement;
    expect(link.getAttribute("href")).toBe(
      "mailto:help@withjosephine.com?subject=Step-up",
    );
  });

  it("falls back to CONTACT_EMAIL mailto when contactMailto omitted", async () => {
    const user = userEvent.setup();
    fetchMock
      .mockResolvedValueOnce(jsonResponse({}, 200))
      .mockResolvedValueOnce(jsonResponse({ reason: "poisoned" }, 422));
    render(
      <StepUpOtpModal open={true} onClose={vi.fn()} onElevated={vi.fn()} />,
    );
    const input = await screen.findByLabelText("6 digit code");
    await user.type(input, "111111");
    await user.click(screen.getByRole("button", { name: "Verify" }));
    const link = (await screen.findByTestId(
      "step-up-contact-link",
    )) as HTMLAnchorElement;
    expect(link.getAttribute("href")).toBe("mailto:hello@withjosephine.com");
    expect(screen.getByTestId("step-up-verify-error")).toHaveTextContent(
      "Too many tries",
    );
  });

  it("shows throttle message + countdown on 429", async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse({ retryAfterSec: 12, reason: "throttled_gap" }, 429),
    );
    render(
      <StepUpOtpModal open={true} onClose={vi.fn()} onElevated={vi.fn()} />,
    );
    const msg = await screen.findByTestId("step-up-throttle-message");
    expect(msg).toHaveTextContent("12 seconds");
    expect(
      screen.queryByLabelText("6 digit code"),
    ).not.toBeInTheDocument();
  });

  it("closes (signals upstream re-auth) on 401 from request", async () => {
    const onClose = vi.fn();
    fetchMock.mockResolvedValueOnce(jsonResponse({}, 401));
    render(
      <StepUpOtpModal open={true} onClose={onClose} onElevated={vi.fn()} />,
    );
    await waitFor(() => expect(onClose).toHaveBeenCalled());
  });

  it("closes on Escape key", async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    fetchMock.mockResolvedValueOnce(jsonResponse({}, 200));
    render(
      <StepUpOtpModal open={true} onClose={onClose} onElevated={vi.fn()} />,
    );
    await screen.findByLabelText("6 digit code");
    await user.keyboard("{Escape}");
    expect(onClose).toHaveBeenCalled();
  });

  it("closes on backdrop click", async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    fetchMock.mockResolvedValueOnce(jsonResponse({}, 200));
    render(
      <StepUpOtpModal open={true} onClose={onClose} onElevated={vi.fn()} />,
    );
    const dialog = await screen.findByRole("dialog");
    // Backdrop is the dialog root; clicking it (not the panel) closes.
    await user.click(dialog);
    expect(onClose).toHaveBeenCalled();
  });

  it("does NOT close when clicking inside the panel", async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    fetchMock.mockResolvedValueOnce(jsonResponse({}, 200));
    render(
      <StepUpOtpModal open={true} onClose={onClose} onElevated={vi.fn()} />,
    );
    const heading = await screen.findByRole("heading", {
      name: "Quick verification",
    });
    await user.click(heading);
    expect(onClose).not.toHaveBeenCalled();
  });
});
