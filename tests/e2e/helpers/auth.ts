import type { Page } from "@playwright/test";

interface SignInArgs {
  email: string;
  next: string;
}

export async function signInViaMagicLink(
  page: Page,
  { email, next }: SignInArgs,
): Promise<void> {
  const issueResponse = await page.context().request.post(
    "/api/internal/issue-magic-link",
    {
      data: { email },
      headers: {
        "content-type": "application/json",
        "x-admin-token": process.env.ADMIN_API_KEY ?? "e2e_admin_api_key_dummy",
      },
    },
  );
  if (issueResponse.status() !== 200) {
    throw new Error(
      `signInViaMagicLink: issue-magic-link returned ${issueResponse.status()}`,
    );
  }
  const { token } = (await issueResponse.json()) as { token: string };

  await page.goto(`/auth/verify?token=${token}&next=${next}`);
  await page.locator("input[name='email']").fill(email);
  await page.locator("button[type='submit']").click();
  await page.waitForURL(new RegExp(escapeForRegex(next)), { timeout: 15_000 });
}

function escapeForRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
