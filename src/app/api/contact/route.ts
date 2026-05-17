import { NextResponse } from "next/server";

import { getClientIp } from "@/lib/request";
import { sendContactMessage } from "@/lib/resend";
import { verifyTurnstileToken } from "@/lib/turnstile";

type ContactRequestBody = {
  name: string;
  email: string;
  message: string;
  turnstileToken: string;
  botcheck?: string;
};

function isContactBody(body: unknown): body is ContactRequestBody {
  if (typeof body !== "object" || body === null) return false;
  const candidate = body as Record<string, unknown>;
  return (
    typeof candidate.name === "string" &&
    typeof candidate.email === "string" &&
    typeof candidate.message === "string" &&
    typeof candidate.turnstileToken === "string"
  );
}

export async function POST(request: Request): Promise<Response> {
  let parsedBody: unknown;
  try {
    parsedBody = await request.json();
  } catch {
    return NextResponse.json({ success: false, error: "Invalid JSON" }, { status: 400 });
  }

  if (!isContactBody(parsedBody)) {
    return NextResponse.json({ success: false, error: "Invalid request body" }, { status: 400 });
  }

  if (parsedBody.botcheck && parsedBody.botcheck !== "") {
    return NextResponse.json({ success: false, error: "Bad request" }, { status: 400 });
  }

  const ip = getClientIp(request);
  const turnstileOk = await verifyTurnstileToken(parsedBody.turnstileToken, ip ?? undefined);
  if (!turnstileOk) {
    return NextResponse.json({ success: false, error: "Verification failed" }, { status: 400 });
  }

  const trimmedName = parsedBody.name.trim();
  const trimmedEmail = parsedBody.email.trim();
  const trimmedMessage = parsedBody.message.trim();

  try {
    const result = await sendContactMessage({
      name: trimmedName,
      email: trimmedEmail,
      message: trimmedMessage,
    });

    switch (result.kind) {
      case "sent":
      case "dry_run":
        return NextResponse.json({ success: true });
      case "skipped":
        console.error(`[contact] skipped: ${result.reason}`);
        return NextResponse.json(
          { success: false, error: "Contact form is not configured" },
          { status: 500 },
        );
      case "failed":
        console.error(`[contact] send failed: ${result.error}`);
        return NextResponse.json({ success: false }, { status: 502 });
    }
  } catch (error) {
    console.error("[contact] unexpected error", error);
    return NextResponse.json({ success: false }, { status: 502 });
  }
}
