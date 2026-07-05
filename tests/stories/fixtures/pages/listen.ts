import type { ListenViewState } from "@/app/(authed)/listen/[id]/ListenView";

export const LISTEN_VIEW_SUBMISSION_ID = "sub_storybook_listen_view";

// Stand-in first page so the delivered story shows a real thumbnail without the
// backend route. Production supplies pdfThumbnailPath from the pdfjs rasterization.
export const LISTEN_VIEW_SAMPLE_PDF_THUMBNAIL = `data:image/svg+xml;utf8,${encodeURIComponent(
  `<svg xmlns='http://www.w3.org/2000/svg' width='420' height='594' viewBox='0 0 420 594'>
     <rect width='420' height='594' fill='#FAF8F4'/>
     <text x='210' y='90' text-anchor='middle' font-family='Georgia, serif' font-style='italic' font-size='30' fill='#3D3633'>Soul Blueprint</text>
     <text x='210' y='120' text-anchor='middle' font-family='Georgia, serif' font-size='13' fill='#7A6F6A'>for you</text>
     ${Array.from({ length: 14 })
       .map((_, i) => {
         const y = 170 + i * 26;
         const w = [300, 340, 320, 350, 290][i % 5];
         return `<rect x='45' y='${y}' width='${w}' height='6' rx='3' fill='#E8D5C4' opacity='0.7'/>`;
       })
       .join("")}
   </svg>`,
)}`;

export const LISTEN_VIEW_DELIVERED_STATE: Extract<ListenViewState, { kind: "delivered" }> = {
  kind: "delivered",
  readingName: "Soul Blueprint",
  recipientName: null,
  voiceNoteAudioPath: `/api/listen/${LISTEN_VIEW_SUBMISSION_ID}/audio`,
  pdfDownloadPath: `/api/listen/${LISTEN_VIEW_SUBMISSION_ID}/pdf`,
  pdfThumbnailPath: LISTEN_VIEW_SAMPLE_PDF_THUMBNAIL,
  showWelcomeRibbon: true,
};

export const LISTEN_VIEW_DELIVERED_NO_THUMBNAIL_STATE: Extract<
  ListenViewState,
  { kind: "delivered" }
> = {
  ...LISTEN_VIEW_DELIVERED_STATE,
  pdfThumbnailPath: null,
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
