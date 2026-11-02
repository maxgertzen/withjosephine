import { NextResponse } from "next/server";

import type { LinksPageButton } from "@/app/tt/LinksPageView";
import { publishedLinksPageButtons } from "@/app/tt/publishedLinksPage";
import { isAutomatedVisitor } from "@/lib/analytics/headless";
import { runMirror } from "@/lib/booking/persistence/runMirror";
import { ROUTES } from "@/lib/constants";
import { USER_AGENT_HEADER } from "@/lib/http/headers";
import { recordTap } from "@/lib/links/tapCounts";
import { checkTapRateLimit } from "@/lib/links/tapRateLimit";

const PREFETCH_HEADERS = ["sec-purpose", "purpose", "x-purpose"];

function isRealTap(headers: Headers): boolean {
  const prefetch = PREFETCH_HEADERS.some((name) => /prefetch|preview/i.test(headers.get(name) ?? ""));
  return !prefetch && !isAutomatedVisitor(headers.get(USER_AGENT_HEADER));
}

async function countTap(key: string, headers: Headers): Promise<void> {
  if (!(await checkTapRateLimit(headers, "tap"))) return;
  try {
    await recordTap(key);
  } catch (error) {
    console.error("[tt-tap] count failed", error);
  }
}

async function findButton(key: string): Promise<LinksPageButton | undefined> {
  try {
    return (await publishedLinksPageButtons()).find((candidate) => candidate.key === key);
  } catch (error) {
    console.error("[tt-tap] links page could not load", error);
    return undefined;
  }
}

export async function GET(request: Request, { params }: { params: Promise<{ key: string }> }): Promise<Response> {
  const { key } = await params;
  const button = await findButton(key);
  if (!button) return NextResponse.redirect(new URL(ROUTES.tt, request.url));
  if (isRealTap(request.headers)) runMirror(countTap(key, request.headers));
  return NextResponse.redirect(new URL(button.href, request.url));
}
