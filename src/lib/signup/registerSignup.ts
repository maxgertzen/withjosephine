import "server-only";

import { publishedEmailFirstSignup } from "@/app/tt/publishedLinksPage";
import { siteOrigin } from "@/lib/env";
import { NEWSLETTER_CONFIRM_ROUTE } from "@/lib/http/routes";
import { type EmailSendResult, sendDownloadLink, sendNewsletterConfirm } from "@/lib/resend";
import { fetchSiteSettingsPublished } from "@/lib/sanity/fetch";

import { type EmailSignup, markEmailSent, saveEmailSignup, type SignupEmail, wantsNewsletter } from "./emailSignups";
import { mintNewsletterConfirmToken } from "./newsletterConfirmToken";
import { newsletterContent } from "./newsletterContent";

export type SignupOutcome = "done" | "not_offered" | "email_failed";

function sentOrSkipped(result: EmailSendResult): boolean {
  return result.kind === "sent" || result.kind === "dry_run";
}

function newsletterOnInSiteSettings(): Promise<boolean> {
  return fetchSiteSettingsPublished().then(
    (settings) => newsletterContent(settings?.newsletter).show,
    () => false,
  );
}

async function sendConfirm(signup: EmailSignup): Promise<EmailSendResult> {
  const token = await mintNewsletterConfirmToken(signup.id, signup.email, Date.parse(signup.createdAt));
  const confirmUrl = `${siteOrigin()}${NEWSLETTER_CONFIRM_ROUTE}?${new URLSearchParams({ token })}`;
  return sendNewsletterConfirm({ to: signup.email, signupId: signup.id, confirmUrl });
}

function sentByAnotherRequest(result: EmailSendResult): boolean {
  return result.kind === "failed" && result.error === "concurrent_idempotent_requests";
}

async function sendAndRecord(signupId: string, email: SignupEmail, sending: Promise<EmailSendResult>): Promise<boolean> {
  const result = await sending;
  if (sentByAnotherRequest(result)) return true;
  if (!sentOrSkipped(result)) return false;
  await markEmailSent(signupId, email).catch((error: unknown) => {
    console.error("[signup] could not record a sent email", error instanceof Error ? error.name : "unknown");
  });
  return true;
}

export async function registerSignup(args: {
  email: string;
  consentText: string | null;
  buttonKey?: string;
}): Promise<SignupOutcome> {
  const download = args.buttonKey ? await publishedEmailFirstSignup(args.buttonKey) : null;
  if (args.buttonKey && !download) return "not_offered";
  const newsletterOn =
    args.consentText !== null && (download ? download.newsletterOn : await newsletterOnInSiteSettings());
  const consentText = newsletterOn ? args.consentText : null;
  if (!download && consentText === null) return "not_offered";

  const signup = await saveEmailSignup({
    email: args.email,
    buttonKey: download ? download.button.key : null,
    consentText,
  });

  const sends: Promise<boolean>[] = [];
  if (download && !signup.downloadSentAt) {
    const sending = sendDownloadLink({
      to: signup.email,
      signupId: signup.id,
      downloadUrl: download.button.href,
      downloadName: download.button.label,
    });
    sends.push(sendAndRecord(signup.id, "download", sending));
  }
  if (wantsNewsletter(signup) && !signup.confirmSentAt) {
    sends.push(sendAndRecord(signup.id, "confirm", sendConfirm(signup)));
  }
  return (await Promise.all(sends)).every(Boolean) ? "done" : "email_failed";
}
