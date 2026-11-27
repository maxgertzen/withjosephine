import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

vi.mock("next/link", () => ({
  default: ({ children, href, ...props }: Record<string, unknown>) => (
    <a href={href as string} {...props}>
      {children as React.ReactNode}
    </a>
  ),
  useLinkStatus: () => ({ pending: false }),
}));

import ErrorPage from "../error";

describe("ErrorPage", () => {
  const mockError = new Error("Test error") as Error & { digest?: string };
  const mockReset = vi.fn();

  it("renders Try Again button that calls reset", async () => {
    const user = userEvent.setup();
    render(<ErrorPage error={mockError} reset={mockReset} />);

    await user.click(screen.getByRole("button", { name: "Try Again" }));

    expect(mockReset).toHaveBeenCalledOnce();
  });
});
