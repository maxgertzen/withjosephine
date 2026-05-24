import type { Metadata } from "next";

import { LISTEN_PAGE_DEFAULTS } from "@/data/defaults";
import { fetchListenPage } from "@/lib/sanity/fetch";

import { ListenView, type ListenViewState } from "../../listen/[id]/ListenView";
import { PreviewStateSwitcher } from "../_components/PreviewStateSwitcher";
import {
  LISTEN_PREVIEW_STATES,
  type ListenPreviewState,
  parseListenState,
  PREVIEW_SUBMISSION_ID,
} from "../_fixtures";

export const metadata: Metadata = {
  title: "Listen — Preview",
  robots: { index: false, follow: false },
};

function buildState(kind: ListenPreviewState): ListenViewState {
  switch (kind) {
    case "delivered":
      return {
        kind: "delivered",
        readingName: "Soul Blueprint",
        voiceNoteAudioPath: `/api/listen/${PREVIEW_SUBMISSION_ID}/audio`,
        pdfDownloadPath: `/api/listen/${PREVIEW_SUBMISSION_ID}/pdf`,
        showWelcomeRibbon: true,
      };
    case "signIn":
      return { kind: "signIn", submissionId: PREVIEW_SUBMISSION_ID };
    case "checkEmail":
      return { kind: "checkEmail", submissionId: PREVIEW_SUBMISSION_ID };
    case "rested":
      return { kind: "rested", submissionId: PREVIEW_SUBMISSION_ID };
    case "throttled":
      return { kind: "throttled", submissionId: PREVIEW_SUBMISSION_ID };
    case "assetTrouble":
      return { kind: "assetTrouble", submissionId: PREVIEW_SUBMISSION_ID };
    case "expired":
      return { kind: "expired", submissionId: PREVIEW_SUBMISSION_ID };
  }
}

export default async function ListenPreviewPage({
  searchParams,
}: {
  searchParams: Promise<{ state?: string }>;
}) {
  const [params, sanity] = await Promise.all([searchParams, fetchListenPage().catch(() => null)]);
  const copy = { ...LISTEN_PAGE_DEFAULTS, ...(sanity ?? {}) };
  const stateKind = parseListenState(params.state);

  return (
    <>
      <PreviewStateSwitcher
        title="Listen page"
        basePath="/preview/listen"
        states={LISTEN_PREVIEW_STATES}
        current={stateKind}
      />
      <ListenView copy={copy} state={buildState(stateKind)} />
    </>
  );
}
