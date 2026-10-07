import { draftMode } from "next/headers";
import { redirect } from "next/navigation";

import { safeRedirectPath } from "@/lib/previewModeCookie";

export async function GET(request: Request) {
  const draft = await draftMode();
  draft.disable();
  redirect(safeRedirectPath(new URL(request.url).searchParams.get("redirect")));
}
