// Recipient claim handler: verifies the raw token, sets the gift-claim
// cookie, 303s to /gift/intake. Lives here (vs the page) because Next 15
// only allows `cookies().set()` from a Route Handler or Server Action.
import { NextResponse } from "next/server";

import { verifyGiftClaimToken } from "@/lib/booking/giftClaim";
import { setGiftClaimCookie } from "@/lib/booking/giftClaimSession";

export const dynamic = "force-dynamic";

export async function GET(request: Request): Promise<Response> {
  const url = new URL(request.url);
  const token = url.searchParams.get("token");
  if (!token) {
    return NextResponse.redirect(new URL("/gift/claim", url.origin), 303);
  }

  const submission = await verifyGiftClaimToken(token);
  if (!submission) {
    return NextResponse.redirect(
      new URL("/gift/claim?invalid=1", url.origin),
      303,
    );
  }

  await setGiftClaimCookie(submission._id);
  return NextResponse.redirect(
    new URL("/gift/intake?welcome=1", url.origin),
    303,
  );
}
