import type { Metadata } from "next";
import { cookies, headers } from "next/headers";

import { LISTEN_INTERSTITIAL_DEFAULTS, LISTEN_PAGE_DEFAULTS } from "@/data/defaults";
import {
  AUDIT_EVENT_TYPE,
  COOKIE_NAME,
  getActiveSession,
  hashUserAgent,
  writeAudit,
} from "@/lib/auth/listenSession";
import { verifyListenToken } from "@/lib/auth/listenToken";
import {
  maybeRecordNewDeviceForSubmission,
  mintNewDeviceRevokeToken,
} from "@/lib/auth/newDeviceNotice";
import { recipientNameFor } from "@/lib/booking/giftPersonas";
import { isReadingExpired } from "@/lib/booking/readingRetention";
import {
  buildSubmissionContext,
  findSubmissionById,
  SUBMISSION_STATUS,
} from "@/lib/booking/submissions";
import { siteOrigin } from "@/lib/env";
import { USER_AGENT_HEADER } from "@/lib/http/headers";
import type { SubmissionRecord } from "@/lib/page-previews/types";
import { sendNewDeviceNotice } from "@/lib/resend";
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

  if (search.error === "rested") {
    return <ListenView copy={copy} state={{ kind: "rested", submissionId: id }} />;
  }

  if (search.error === "throttled") {
    return <ListenView copy={copy} state={{ kind: "throttled", submissionId: id }} />;
  }

  const submission = session ? await findSubmissionById(id) : null;
  const state = resolveAuthenticatedState({ id, session, submission, welcome: search.welcome });

  // New-device notice detection. Fires only when the session is valid AND the
  // submission belongs to the session user AND the current UA-hash differs
  // from the earliest-recorded redemption baseline for this submission.
  // Best-effort; swallows DB errors so the page render never blocks on it.
  if (
    session &&
    submission &&
    state.kind === "delivered" &&
    submission.recipientUserId === session.userId
  ) {
    void detectAndFireNewDeviceNotice({
      submissionId: id,
      recipientUserId: session.userId,
      submission,
    });
  }

  return <ListenView copy={copy} state={state} />;
}

async function detectAndFireNewDeviceNotice(args: {
  submissionId: string;
  recipientUserId: string;
  submission: SubmissionRecord;
}): Promise<void> {
  try {
    const requestHeaders = await headers();
    const ua = requestHeaders.get(USER_AGENT_HEADER) ?? "";
    if (!ua) return;
    const currentUaHash = await hashUserAgent(ua);
    const record = await maybeRecordNewDeviceForSubmission({
      submissionId: args.submissionId,
      recipientUserId: args.recipientUserId,
      currentUaHash,
    });
    if (!record.fired) return;

    const ctx = buildSubmissionContext(args.submission);
    const revokeToken = await mintNewDeviceRevokeToken({
      recipientUserId: args.recipientUserId,
      submissionId: args.submissionId,
    });
    const revokeUrl = new URL(
      "/api/auth/revoke-recipient-sessions",
      siteOrigin(),
    );
    revokeUrl.searchParams.set("t", revokeToken);

    await sendNewDeviceNotice({
      to: ctx.email,
      firstName: ctx.firstName,
      submissionId: args.submissionId,
      revokeUrl: revokeUrl.toString(),
    });

    await writeAudit({
      userId: args.recipientUserId,
      submissionId: args.submissionId,
      eventType: AUDIT_EVENT_TYPE.new_device_notice_sent,
      success: true,
    });
  } catch (err) {
    console.error("[new-device-notice] fire failed", err);
  }
}

function resolveAuthenticatedState(args: {
  id: string;
  session: { userId: string; sessionId: string; elevatedAt: number | null } | null;
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

  // recipientNameFor walks the canonical chain: purchaser-supplied recipient_name,
  // then recipient-intake first_name, then legal_full_name, then email-local.
  // The intake overwrites responses at redeem, so the bare recipient_name lookup
  // would lose the name for the actual recipient leg. Gate on isGift so a
  // self-purchase doesn't show a greeting at all.
  const recipientName = args.submission.isGift
    ? recipientNameFor(args.submission)
    : null;

  return {
    kind: "delivered",
    readingName: (args.submission.reading?.name ?? "your reading").replace(/^The\s+/, ""),
    recipientName,
    voiceNoteAudioPath: args.submission.voiceNoteUrl ? `/api/listen/${args.id}/audio` : null,
    pdfDownloadPath: args.submission.pdfUrl ? `/api/listen/${args.id}/pdf` : null,
    showWelcomeRibbon: args.welcome === "1",
  };
}
