import "server-only";

import { addNewsletterContact } from "@/lib/marketing/newsletterProvider";

import { findEmailSignup, markNewsletterConfirmed, markProviderSynced } from "./emailSignups";
import { claimMatchesEmail, readNewsletterConfirmToken } from "./newsletterConfirmToken";

export async function confirmNewsletterSignup(token: string, now = new Date()): Promise<boolean> {
  const claim = await readNewsletterConfirmToken(token, now.getTime());
  const signup = claim ? await findEmailSignup(claim.signupId) : null;
  if (!claim || !signup?.wantsNewsletter || !(await claimMatchesEmail(claim, signup.email))) return false;

  await markNewsletterConfirmed(signup.id, now);
  if (!signup.providerSyncedAt) {
    const added = await addNewsletterContact(signup.email);
    if (added.kind === "added") await markProviderSynced(signup.id, now);
    if (added.kind === "failed") console.error(`[newsletter] provider add failed: ${added.error}`);
  }
  return true;
}
