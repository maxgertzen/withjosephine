import type { ListenViewState } from "@/app/(authed)/listen/[id]/ListenView";
import type { ResolvedThankYouContext } from "@/app/(authed)/thank-you/[readingId]/deriveThankYouViewProps";
import type { VerifyPageViewState } from "@/app/auth/verify/VerifyPageView";

export const LISTEN_FIXTURES: Record<string, ListenViewState> = {
  delivered: {
    kind: "delivered",
    readingName: "Soul Blueprint",
    recipientName: "Bob",
    voiceNoteAudioPath: "/preview-fixture/voice-note.m4a",
    pdfDownloadPath: "/preview-fixture/reading.pdf",
    showWelcomeRibbon: true,
  },
  signIn: { kind: "signIn", submissionId: "preview-submission-001" },
  checkEmail: { kind: "checkEmail", submissionId: "preview-submission-001" },
  rested: { kind: "rested", submissionId: "preview-submission-001" },
  throttled: { kind: "throttled", submissionId: "preview-submission-001" },
  assetTrouble: { kind: "assetTrouble", submissionId: "preview-submission-001" },
  expired: { kind: "expired", submissionId: "preview-submission-001" },
};

export const VERIFY_FIXTURES: Record<string, VerifyPageViewState> = {
  confirm: { kind: "confirm", token: "preview-token", next: "/" },
  rested: { kind: "rested" },
};

export const THANKYOU_FIXTURES: Record<string, ResolvedThankYouContext> = {
  "full-price": {
    reading: { name: "Soul Blueprint", price: "$129", cents: 12900 },
    paidAmount: { cents: 12900, display: "$129" },
  },
  discounted: {
    reading: { name: "Birth Chart Reading", price: "$89", cents: 8900 },
    paidAmount: { cents: 4900, display: "$49" },
  },
};

export const GIFT_PREVIEW_STATES = [
  { state: "buy-sheet", title: "Buy sheet" },
  { state: "buyer-thank-you", title: "Thank-you page for the buyer" },
  { state: "redeem-sheet", title: "Redeem sheet" },
  { state: "opened", title: "Opened, with a note" },
  { state: "opened-no-note", title: "Opened, no note" },
  { state: "already-opened", title: "Already opened" },
  { state: "no-longer-active", title: "No longer active" },
  { state: "not-found", title: "Code not found" },
  { state: "last-page", title: "Last page of the form" },
  { state: "recipient-thank-you", title: "Thank-you page for the recipient" },
  { state: "send-link", title: "Send page" },
] as const;

export type GiftPreviewState = (typeof GIFT_PREVIEW_STATES)[number]["state"];

export function giftPreviewPath(state: GiftPreviewState, readingSlug?: string): string {
  const path = `/preview/gift/${state}`;
  return readingSlug ? `${path}?reading=${encodeURIComponent(readingSlug)}` : path;
}

export function giftRecipientPreviewLinks(readingSlug: string, readingName = "Gift recipient view") {
  return [
    { title: readingName, href: giftPreviewPath("opened", readingSlug) },
    { title: `${readingName}, last page`, href: giftPreviewPath("last-page", readingSlug) },
  ];
}

export const LISTEN_PREVIEW_STATES = [
  { state: "delivered", title: "Reading ready" },
  { state: "signIn", title: "Sign in" },
  { state: "checkEmail", title: "Check your email" },
  { state: "rested", title: "Link rested" },
  { state: "throttled", title: "Too many tries" },
  { state: "assetTrouble", title: "Files not loading" },
  { state: "expired", title: "Access ended" },
] as const;

export const SIGN_IN_LINK_PREVIEW_STATES = [
  { state: "confirm", title: "Confirm sign-in" },
  { state: "rested", title: "Link rested" },
] as const;

function previewLinks<State extends string>(
  states: readonly { state: State; title: string }[],
  href: (state: State) => string,
) {
  return states.map(({ state, title }) => ({ title, href: href(state) }));
}

export const LISTEN_PREVIEW_LINKS = previewLinks(LISTEN_PREVIEW_STATES, (state) => `/preview/listen/${state}`);
export const SIGN_IN_LINK_PREVIEW_LINKS = previewLinks(
  SIGN_IN_LINK_PREVIEW_STATES,
  (state) => `/preview/sign-in-link/${state}`,
);
export const GIFT_PREVIEW_LINKS = previewLinks(GIFT_PREVIEW_STATES, giftPreviewPath);
