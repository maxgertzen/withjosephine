import type { Metadata } from "next";
import { cookies } from "next/headers";

import { LISTEN_INTERSTITIAL_DEFAULTS, LISTEN_PAGE_DEFAULTS } from "@/data/defaults";
import {
  AUDIT_EVENT_TYPE,
  COOKIE_NAME,
  getActiveSession,
  writeAudit,
} from "@/lib/auth/listenSession";
import { verifyListenToken } from "@/lib/auth/listenToken";
import { isReadingExpired } from "@/lib/booking/readingRetention";
import { findSubmissionById, SUBMISSION_STATUS } from "@/lib/booking/submissions";
import type { SubmissionRecord } from "@/lib/page-previews/types";
import { fetchListenPage } from "@/lib/sanity/fetch";
import { pickDefined } from "@/lib/sanity/pickDefined";

import { ListenTokenInterstitial } from "./ListenTokenInterstitial";
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
  t?: string;
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

  const copy: ListenViewProps["copy"] = { ...LISTEN_PAGE_DEFAULTS, ...pickDefined(sanity ?? {}) };

  // One-tap token branch. The `?t=` arrives via the day-7 delivery email.
  // GET renders the interstitial (no redemption side effect); POST to the
  // companion redeem route is what consumes the single-use ledger row.
  // Token verification needs the submission's recipientUserId so the
  // recipient_changed gate fires after an admin swap mid-window.
  const tokenParam = typeof search.t === "string" ? search.t : undefined;
  if (tokenParam) {
    const tokenSubmission = await findSubmissionById(id);
    if (tokenSubmission?.recipientUserId) {
      const verify = await verifyListenToken({
        token: tokenParam,
        currentRecipientUserId: tokenSubmission.recipientUserId,
      });
      if (verify.valid && verify.submissionId === id) {
        return (
          <ListenTokenInterstitial
            submissionId={id}
            token={tokenParam}
            copy={LISTEN_INTERSTITIAL_DEFAULTS}
          />
        );
      }
      if (verify.valid && verify.submissionId !== id) {
        // Forensic-only audit, then silent fall-through to the normal flow.
        // Don't surface the failure to the user, an attacker probing for
        // token-id confusion shouldn't get a distinct response shape.
        await writeAudit({
          userId: tokenSubmission.recipientUserId,
          submissionId: id,
          eventType: AUDIT_EVENT_TYPE.listen_token_id_mismatch,
          success: false,
        });
      }
      // Else (malformed, bad_signature, expired, recipient_changed): silent
      // fall-through. The user still sees the magic-link form below.
    }
    // No `else` recipientUserId pad here, the page already calls
    // findSubmissionById further down for an authenticated visitor; the
    // pure-token visitor path took the extra fetch above, so timing across
    // the two arms differs by at most one DB hop.
  }

  // ?sent=1 wins over an active session — user just submitted the form.
  if (search.sent === "1") {
    return <ListenView copy={copy} state={{ kind: "checkEmail", submissionId: id }} />;
  }

  const submission = session ? await findSubmissionById(id) : null;
  const state = resolveAuthenticatedState({ id, session, submission, welcome: search.welcome });

  // A valid, authorized session outranks a stale ?error left behind by a
  // re-clicked or already-consumed magic link (the verify route 303s to
  // ?error=rested on every failure mode). Only surface the error cards when the
  // visitor is genuinely unauthenticated for this submission (state === signIn).
  if (state.kind === "signIn") {
    if (search.error === "rested") {
      return <ListenView copy={copy} state={{ kind: "rested", submissionId: id }} />;
    }
    if (search.error === "throttled") {
      return <ListenView copy={copy} state={{ kind: "throttled", submissionId: id }} />;
    }
  }

  return <ListenView copy={copy} state={state} />;
}

function resolveAuthenticatedState(args: {
  id: string;
  session: { userId: string; sessionId: string } | null;
  submission: SubmissionRecord | null;
  welcome: string | undefined;
}): ListenViewState {
  // Uniform signIn for no-session / cross-user / unknown-submission — no enumeration leak.
  if (!args.session) return { kind: "signIn", submissionId: args.id };
  if (!args.submission) return { kind: "signIn", submissionId: args.id };
  if (args.submission.recipientUserId !== args.session.userId) {
    return { kind: "signIn", submissionId: args.id };
  }

  const hasAssets = Boolean(args.submission.voiceNoteUrl || args.submission.pdfUrl);
  const isDeliverable =
    args.submission.status === SUBMISSION_STATUS.paid && args.submission.deliveredAt && hasAssets;
  if (!isDeliverable) return { kind: "assetTrouble", submissionId: args.id };
  const deliveredAtMs = args.submission.deliveredAt
    ? Date.parse(args.submission.deliveredAt)
    : null;
  if (isReadingExpired(deliveredAtMs)) {
    return { kind: "expired", submissionId: args.id };
  }

  return {
    kind: "delivered",
    readingName: (args.submission.reading?.name ?? "your reading").replace(/^The\s+/, ""),
    recipientName: null,
    voiceNoteAudioPath: args.submission.voiceNoteUrl ? `/api/listen/${args.id}/audio` : null,
    pdfDownloadPath: args.submission.pdfUrl ? `/api/listen/${args.id}/pdf` : null,
    showWelcomeRibbon: args.welcome === "1",
  };
}
