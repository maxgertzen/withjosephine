import "server-only";

import { cookies } from "next/headers";

import { AUDIT_EVENT_TYPE } from "@/lib/audit/eventTypes";
import { COOKIE_NAME, getActiveSession, writeAudit } from "@/lib/auth/listenSession";
import { checkRateLimit } from "@/lib/auth/rateLimit";
import { getClientIpKey, getRequestAuditContext } from "@/lib/auth/requestAudit";
import { findSubmissionListenContext } from "@/lib/booking/submissions";

// Allowlisted upstream headers — Server / X-* are dropped so we don't
// leak Sanity's CDN identity on every chunk.
const FORWARD_HEADERS = [
  "content-type",
  "content-length",
  "content-range",
  "accept-ranges",
  "etag",
  "last-modified",
  "cache-control",
] as const;

export function proxySanityAsset(
  upstream: Response,
  options: { contentDisposition: string },
): Response {
  const headers = new Headers();
  for (const name of FORWARD_HEADERS) {
    const value = upstream.headers.get(name);
    if (value) headers.set(name, value);
  }
  headers.set("content-disposition", options.contentDisposition);

  return new Response(upstream.body, {
    status: upstream.status,
    statusText: upstream.statusText,
    headers,
  });
}

export function forwardRangeHeader(request: Request): Headers {
  const headers = new Headers();
  const range = request.headers.get("range");
  if (range) headers.set("range", range);
  return headers;
}

// Gates the listenedAt mirror to the opener: browsers open audio with
// no Range or bytes=0- before issuing mid-file scrub chunks.
export function isFirstByteRequest(request: Request): boolean {
  const range = request.headers.get("range");
  return !range || range.replace(/\s+/g, "") === "bytes=0-";
}

type AssetContext = {
  voiceNoteUrl: string | null;
  pdfUrl: string | null;
  readingSlug: string;
  readingName: string | null;
  submissionId: string;
  firstName: string | null;
  lastName: string | null;
};

type GateResult =
  | { ok: true; asset: AssetContext }
  | { ok: false; response: Response };

// Single D1 round-trip via findSubmissionListenContext — caller never
// re-queries the submission. Every denial path emits an audit row so
// cross-user probes leave a forensic trail. Session lookup + submission
// context lookup are independent reads — fan out in parallel to cut audio
// hot-path latency on every Range request.
export async function gateListenAssetRequest(
  request: Request,
  submissionId: string,
): Promise<GateResult> {
  const allowed = await checkRateLimit("LISTEN_ASSET_LIMITER", getClientIpKey(request));
  if (!allowed) return { ok: false, response: new Response("Too many requests", { status: 429 }) };

  const cookieStore = await cookies();
  const cookieValue = cookieStore.get(COOKIE_NAME)?.value ?? "";
  const audit = await getRequestAuditContext(request);
  const [session, ctx] = await Promise.all([
    cookieValue ? getActiveSession({ cookieValue }) : Promise.resolve(null),
    findSubmissionListenContext(submissionId),
  ]);

  if (!session) {
    await writeAudit({
      userId: null,
      submissionId,
      eventType: AUDIT_EVENT_TYPE.listen_session_invalid,
      ipHash: audit.ipHash,
      userAgentHash: audit.userAgentHash,
      success: false,
    });
    return { ok: false, response: new Response("Forbidden", { status: 403 }) };
  }

  if (!ctx?.recipientUserId) {
    await writeAudit({
      userId: session.userId,
      submissionId,
      eventType: AUDIT_EVENT_TYPE.listen_session_invalid,
      ipHash: audit.ipHash,
      userAgentHash: audit.userAgentHash,
      success: false,
    });
    return { ok: false, response: new Response("Forbidden", { status: 403 }) };
  }

  if (session.userId !== ctx.recipientUserId) {
    await writeAudit({
      userId: session.userId,
      submissionId,
      eventType: AUDIT_EVENT_TYPE.listen_cross_user_denied,
      ipHash: audit.ipHash,
      userAgentHash: audit.userAgentHash,
      success: false,
    });
    return { ok: false, response: new Response("Forbidden", { status: 403 }) };
  }

  return {
    ok: true,
    asset: {
      voiceNoteUrl: ctx.voiceNoteUrl,
      pdfUrl: ctx.pdfUrl,
      readingSlug: ctx.readingSlug,
      readingName: ctx.readingName,
      submissionId: ctx.submissionId,
      firstName: ctx.firstName,
      lastName: ctx.lastName,
    },
  };
}
