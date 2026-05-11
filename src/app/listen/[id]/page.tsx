import type { Metadata } from "next";
import { cookies } from "next/headers";

import { LISTEN_PAGE_DEFAULTS } from "@/data/defaults";
import { COOKIE_NAME, getActiveSession } from "@/lib/auth/listenSession";
import { findSubmissionById, type SubmissionRecord } from "@/lib/booking/submissions";
import { fetchListenPage } from "@/lib/sanity/fetch";

import { ListenView, type ListenViewProps, type ListenViewState } from "./ListenView";

export const metadata: Metadata = {
  title: "Your reading — Josephine",
  description: "Listen to your reading and download the supporting PDF.",
  robots: { index: false, follow: false },
};

type Search = {
  welcome?: string;
  sent?: string;
  error?: string;
};

export default async function ListenPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Search>;
}) {
  const cookieStore = await cookies();
  const cookieValue = cookieStore.get(COOKIE_NAME)?.value ?? "";

  const [{ id }, search, sanity, session] = await Promise.all([
    params,
    searchParams,
    fetchListenPage().catch(() => null),
    cookieValue ? getActiveSession({ cookieValue }) : Promise.resolve(null),
  ]);

  const copy: ListenViewProps["copy"] = { ...LISTEN_PAGE_DEFAULTS, ...(sanity ?? {}) };

  // ?sent=1 takes precedence over any authentication state for the listen
  // flow — the user has just submitted the form; show check-email even if
  // they happen to already have an active session (matches /my-readings'
  // tie-break behaviour from D-2).
  if (search.sent === "1") {
    return <ListenView copy={copy} state={{ kind: "checkEmail", submissionId: id }} />;
  }

  if (search.error === "rested") {
    return <ListenView copy={copy} state={{ kind: "rested", submissionId: id }} />;
  }

  if (search.error === "throttled") {
    return <ListenView copy={copy} state={{ kind: "throttled", submissionId: id }} />;
  }

  const submission = session ? await findSubmissionById(id) : null;
  const state = resolveAuthenticatedState({ id, session, submission, welcome: search.welcome });
  return <ListenView copy={copy} state={state} />;
}

function resolveAuthenticatedState(args: {
  id: string;
  session: { userId: string; sessionId: string } | null;
  submission: SubmissionRecord | null;
  welcome: string | undefined;
}): ListenViewState {
  // Uniform "sign-in" surface for unauthenticated, mismatched, AND
  // unknown-submission cases. No enumeration leak about whether a given
  // submission id exists for someone else.
  if (!args.session) return { kind: "signIn", submissionId: args.id };
  if (!args.submission) return { kind: "signIn", submissionId: args.id };
  if (args.submission.recipientUserId !== args.session.userId) {
    return { kind: "signIn", submissionId: args.id };
  }

  // Owned by this session: route to delivered surface only when the
  // reading actually has assets to play; otherwise show the
  // brand-voiced "asset trouble" state (D-4).
  const hasAssets = Boolean(args.submission.voiceNoteUrl || args.submission.pdfUrl);
  const isDeliverable =
    args.submission.status === "paid" && args.submission.deliveredAt && hasAssets;
  if (!isDeliverable) return { kind: "assetTrouble", submissionId: args.id };

  return {
    kind: "delivered",
    readingName: args.submission.reading?.name ?? "your reading",
    voiceNoteAudioPath: args.submission.voiceNoteUrl ? `/api/listen/${args.id}/audio` : null,
    pdfDownloadPath: args.submission.pdfUrl ? `/api/listen/${args.id}/pdf` : null,
    showWelcomeRibbon: args.welcome === "1",
  };
}
