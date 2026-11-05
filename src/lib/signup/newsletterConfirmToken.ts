import { createSignedTokenCodec, recipientHashMatches } from "@/lib/auth/signedToken";

export const NEWSLETTER_CONFIRM_TTL_MS = 7 * 24 * 60 * 60 * 1000;

type NewsletterConfirmMintSource = "newsletter_signup";

const codec = createSignedTokenCodec<NewsletterConfirmMintSource>({
  purpose: "newsletter.v1",
  defaultTtlMs: NEWSLETTER_CONFIRM_TTL_MS,
  isValidMintSource: (value): value is NewsletterConfirmMintSource => value === "newsletter_signup",
});

export type NewsletterConfirmClaim = { signupId: string; emailHash: string };

export function mintNewsletterConfirmToken(signupId: string, email: string, now?: number): Promise<string> {
  return codec.mint({ submissionId: signupId, recipientUserId: email, mintSource: "newsletter_signup", now, jti: signupId });
}

export async function readNewsletterConfirmToken(token: string, now?: number): Promise<NewsletterConfirmClaim | null> {
  const result = await codec.verify(token, now);
  return result.valid ? { signupId: result.submissionId, emailHash: result.recipientUserIdHash } : null;
}

export function claimMatchesEmail(claim: NewsletterConfirmClaim, email: string): Promise<boolean> {
  return recipientHashMatches(claim.emailHash, email);
}
