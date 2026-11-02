import { publishedLinksPageButtons } from "@/app/tt/publishedLinksPage";
import { studioRoute } from "@/lib/http/studioCors";
import { tapCountsByKey } from "@/lib/links/tapCounts";
import { checkTapRateLimit } from "@/lib/links/tapRateLimit";

export const dynamic = "force-dynamic";

const NO_TAPS = { last7Days: 0, last30Days: 0 };
const STUDIO_REUSES_FOR_A_MINUTE = "private, max-age=60";

export const GET = studioRoute("tt-taps", async (request) => {
  if (!(await checkTapRateLimit(request.headers, "stats"))) return new Response(null, { status: 429 });
  const [buttons, counts] = await Promise.all([publishedLinksPageButtons(), tapCountsByKey()]);
  const rows = buttons
    .filter(({ countsTaps }) => countsTaps)
    .map(({ key, label }) => ({ key, label, ...(counts.get(key) ?? NO_TAPS) }));
  return Response.json({ buttons: rows }, { headers: { "Cache-Control": STUDIO_REUSES_FOR_A_MINUTE } });
});
