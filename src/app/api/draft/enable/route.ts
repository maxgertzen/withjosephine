import { draftMode } from "next/headers";
import { redirect } from "next/navigation";
import { NextResponse, type NextRequest } from "next/server";

/**
 * Draft-mode entry point wired up by Sanity's presentationTool.
 * The Studio iframe calls `/api/draft/enable?secret=...&slug=...` to switch the
 * viewer into `previewDrafts` perspective for this tab only.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const secret = searchParams.get("secret");
  const slug = searchParams.get("slug") ?? "/";

  if (!process.env.SANITY_PREVIEW_SECRET || secret !== process.env.SANITY_PREVIEW_SECRET) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const draft = await draftMode();
  draft.enable();

  // Normalise: only allow in-site redirects to prevent open-redirect abuse.
  const safeSlug = slug.startsWith("/") ? slug : `/${slug}`;
  redirect(safeSlug);
}
