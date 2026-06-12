import { scheduleListenedAtMirror } from "@/lib/booking/submissions";

import { buildContentDisposition, buildListenFilename } from "../downloadFilename";
import {
  forwardRangeHeader,
  gateListenAssetRequest,
  isFirstByteRequest,
  proxySanityAsset,
} from "../proxySanityAsset";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const gate = await gateListenAssetRequest(request, id);
  if (!gate.ok) return gate.response;
  if (!gate.asset.voiceNoteUrl) return new Response("Not found", { status: 404 });

  const upstream = await fetch(gate.asset.voiceNoteUrl, {
    headers: forwardRangeHeader(request),
  });

  if (upstream.ok && isFirstByteRequest(request)) {
    scheduleListenedAtMirror(id, new Date().toISOString());
  }

  const filename = buildListenFilename({
    firstName: gate.asset.firstName,
    lastName: gate.asset.lastName,
    readingName: gate.asset.readingName,
    readingSlug: gate.asset.readingSlug,
    submissionId: gate.asset.submissionId,
    sourceUrl: gate.asset.voiceNoteUrl,
    kind: "voice-note",
  });
  return proxySanityAsset(upstream, {
    contentDisposition: buildContentDisposition({ type: "inline", filename }),
  });
}
