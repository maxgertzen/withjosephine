// Route Handler for the recipient claim link. The previous implementation
// lived in `src/app/gift/claim/page.tsx` and called `setGiftClaimCookie`
// (which mutates `cookies()`) from a Server Component — Next 15 disallows
// that and throws "Cookies can only be modified in a Server Action or
// Route Handler". Every gift claim attempt was hitting the global error
// boundary as a result.
//
// The page now redirects here with the raw token. This handler verifies
// the token, sets the `__Host-gift_claim_session` cookie, and 303s to
// `/gift/intake?welcome=1` (success) or back to `/gift/claim?invalid=1`
// (token missing / already used / cancelled — the page renders the
// VellumShell fallback in that case).
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
