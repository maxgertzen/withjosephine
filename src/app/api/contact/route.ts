import { NextResponse } from "next/server";

import { getClientIp } from "@/lib/request";
import { verifyTurnstileToken } from "@/lib/turnstile";

const W3FORMS_ENDPOINT = "https://api.web3forms.com/submit";

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

  const accessKey = process.env.WEB3FORMS_KEY;
  if (!accessKey) {
    console.error("[contact] Web3Forms access key is not configured");
    return NextResponse.json(
      { success: false, error: "Contact form is not configured" },
      { status: 500 },
    );
  }

  const trimmedName = parsedBody.name.trim();
  const trimmedEmail = parsedBody.email.trim();
  const trimmedMessage = parsedBody.message.trim();

  const upstream = await fetch(W3FORMS_ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      access_key: accessKey,
      name: trimmedName,
      email: trimmedEmail,
      message: trimmedMessage,
      subject: `New message from ${trimmedName}`,
      botcheck: "",
    }),
  });

  const data = (await upstream.json().catch(() => null)) as { success?: boolean } | null;

  if (!upstream.ok || !data?.success) {
    return NextResponse.json({ success: false }, { status: 502 });
  }

  return NextResponse.json({ success: true });
}
