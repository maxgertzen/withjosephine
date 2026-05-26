import "server-only";

import { NextResponse } from "next/server";

import { isElevated } from "@/lib/auth/listenSession";
import { CONTACT_EMAIL } from "@/lib/constants";

/**
 * Gate high-risk gift mutations (edit-recipient, send-now, eventual
 * claim-for-yourself) on a recent step-up OTP verify. Returns null when
 * the session is elevated (caller proceeds) or a fully-formed 401
 * response when not (caller returns it). UI consumers branch on
 * `error === "elevation_required"` to open the OTP modal.
 *
 * 401 (not 403) is intentional: the client treats this as a recoverable
 * "you need to authenticate again," symmetric with how no-cookie is
 * surfaced. 403 would imply the user is permanently denied.
 */
const CONTACT_MAILTO = `mailto:${CONTACT_EMAIL}?subject=Step-up%20help`;

export function requireElevation(
  session: { elevatedAt: number | null },
  now?: number,
): Response | null {
  if (isElevated(session, now)) return null;
  return NextResponse.json(
    {
      error: "elevation_required",
      contactMailto: CONTACT_MAILTO,
    },
    { status: 401 },
  );
}
