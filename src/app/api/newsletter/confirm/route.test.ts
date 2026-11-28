import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/signup/confirmNewsletterSignup", () => ({ confirmNewsletterSignup: vi.fn() }));

import { confirmNewsletterSignup } from "@/lib/signup/confirmNewsletterSignup";

import { POST } from "./route";

function submit(fields: Record<string, string>): Promise<Response> {
  return POST(
    new Request("https://withjosephine.com/api/newsletter/confirm", {
      method: "POST",
      body: new URLSearchParams(fields),
    }),
  );
}

beforeEach(() => {
  vi.mocked(confirmNewsletterSignup).mockReset();
});

describe("POST /api/newsletter/confirm", () => {
  it("sends the visitor to the confirmed page when the token is good", async () => {
    vi.mocked(confirmNewsletterSignup).mockResolvedValue(true);

    const response = await submit({ token: "good" });

    expect(response.status).toBe(303);
    expect(response.headers.get("location")).toBe("https://withjosephine.com/newsletter/confirm?status=confirmed");
    expect(confirmNewsletterSignup).toHaveBeenCalledWith("good");
  });

  it("sends the visitor to the failed page when the token is refused", async () => {
    vi.mocked(confirmNewsletterSignup).mockResolvedValue(false);

    const response = await submit({ token: "bad" });

    expect(response.headers.get("location")).toBe("https://withjosephine.com/newsletter/confirm?status=failed");
  });

  it("sends the visitor to the failed page without a token", async () => {
    const response = await submit({});

    expect(response.headers.get("location")).toBe("https://withjosephine.com/newsletter/confirm?status=failed");
    expect(confirmNewsletterSignup).not.toHaveBeenCalled();
  });
});
