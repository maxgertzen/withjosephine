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

export const PREVIEW_SURFACES = ["listen", "magic-link-verify", "thank-you"] as const;
export type PreviewSurface = (typeof PREVIEW_SURFACES)[number];

export function previewStateKeysFor(surface: PreviewSurface): string[] {
  if (surface === "listen") return Object.keys(LISTEN_FIXTURES);
  if (surface === "thank-you") return Object.keys(THANKYOU_FIXTURES);
  return Object.keys(VERIFY_FIXTURES);
}
