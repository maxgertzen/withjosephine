import type { ListenViewState } from "@/app/(authed)/listen/[id]/ListenView";

export const LISTEN_VIEW_SUBMISSION_ID = "sub_storybook_listen_view";

export const LISTEN_VIEW_DELIVERED_STATE: Extract<ListenViewState, { kind: "delivered" }> = {
  kind: "delivered",
  readingName: "Soul Blueprint",
  recipientName: null,
  voiceNoteAudioPath: `/api/listen/${LISTEN_VIEW_SUBMISSION_ID}/audio`,
  pdfDownloadPath: `/api/listen/${LISTEN_VIEW_SUBMISSION_ID}/pdf`,
  showWelcomeRibbon: true,
};

export const LISTEN_VIEW_DELIVERED_GIFT_RECIPIENT_STATE: Extract<
  ListenViewState,
  { kind: "delivered" }
> = {
  ...LISTEN_VIEW_DELIVERED_STATE,
  recipientName: "Mira",
};

export const LISTEN_VIEW_SIGN_IN_STATE: ListenViewState = {
  kind: "signIn",
  submissionId: LISTEN_VIEW_SUBMISSION_ID,
};

export const LISTEN_VIEW_CHECK_EMAIL_STATE: ListenViewState = {
  kind: "checkEmail",
  submissionId: LISTEN_VIEW_SUBMISSION_ID,
};

export const LISTEN_VIEW_RESTED_STATE: ListenViewState = {
  kind: "rested",
  submissionId: LISTEN_VIEW_SUBMISSION_ID,
};

export const LISTEN_VIEW_THROTTLED_STATE: ListenViewState = {
  kind: "throttled",
  submissionId: LISTEN_VIEW_SUBMISSION_ID,
};

export const LISTEN_VIEW_ASSET_TROUBLE_STATE: ListenViewState = {
  kind: "assetTrouble",
  submissionId: LISTEN_VIEW_SUBMISSION_ID,
};

export const LISTEN_VIEW_EXPIRED_STATE: ListenViewState = {
  kind: "expired",
  submissionId: LISTEN_VIEW_SUBMISSION_ID,
};
