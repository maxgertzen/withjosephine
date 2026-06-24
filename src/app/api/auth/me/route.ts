import { NextResponse } from "next/server";

import { getSignedInUser } from "@/lib/auth/sessionUser";

export async function GET(): Promise<Response> {
  const user = await getSignedInUser();

  const body = user ? { signedIn: true, email: user.email } : { signedIn: false };
  return NextResponse.json(body, {
    status: 200,
    headers: { "Cache-Control": "private, no-store" },
  });
}
