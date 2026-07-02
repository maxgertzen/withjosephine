import type { ListenViewState } from "@/app/(authed)/listen/[id]/ListenView";
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

export const PREVIEW_SURFACES = ["listen", "magic-link-verify"] as const;
export type PreviewSurface = (typeof PREVIEW_SURFACES)[number];

export function previewStateKeysFor(surface: PreviewSurface): string[] {
  if (surface === "listen") return Object.keys(LISTEN_FIXTURES);
  return Object.keys(VERIFY_FIXTURES);
}
