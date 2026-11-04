import "server-only";

import { publishedEmailFirstButton } from "@/app/tt/publishedLinksPage";
import { siteOrigin } from "@/lib/env";
import { NEWSLETTER_CONFIRM_ROUTE } from "@/lib/http/routes";
import { type EmailSendResult, sendDownloadLink, sendNewsletterConfirm } from "@/lib/resend";
import { fetchSiteSettingsPublished } from "@/lib/sanity/fetch";

import { saveEmailSignup } from "./emailSignups";
import { mintNewsletterConfirmToken } from "./newsletterConfirmToken";
import { newsletterContent } from "./newsletterContent";

export type SignupOutcome = "done" | "not_offered" | "email_failed";

function sentOrSkipped(result: EmailSendResult): boolean {
  return result.kind === "sent" || result.kind === "dry_run";
}

export async function registerSignup(args: {
  email: string;
  consentText: string | null;
  buttonKey?: string;
}): Promise<SignupOutcome> {
  const [download, newsletterOn] = await Promise.all([
    args.buttonKey ? publishedEmailFirstButton(args.buttonKey) : null,
    args.consentText === null
      ? false
      : fetchSiteSettingsPublished().then(
          (settings) => newsletterContent(settings?.newsletter).show,
          () => false,
        ),
  ]);
  const consentText = newsletterOn ? args.consentText : null;
  if (args.buttonKey && !download) return "not_offered";
  if (!download && consentText === null) return "not_offered";

  const signup = await saveEmailSignup({
    email: args.email,
    source: download ? `links:${download.key}` : "footer",
    consentText,
  });

  const origin = siteOrigin();
  const sends: Promise<EmailSendResult>[] = [];
  if (download) {
    sends.push(
      sendDownloadLink({
        to: signup.email,
        signupId: signup.id,
        downloadUrl: download.href,
        downloadName: download.label,
      }),
    );
  }
  if (signup.wantsNewsletter) {
    const token = await mintNewsletterConfirmToken(signup.id, signup.email);
    const confirmUrl = `${origin}${NEWSLETTER_CONFIRM_ROUTE}?${new URLSearchParams({ token })}`;
    sends.push(sendNewsletterConfirm({ to: signup.email, signupId: signup.id, confirmUrl }));
  }

  const results = await Promise.all(sends);
  return results.every(sentOrSkipped) ? "done" : "email_failed";
}
