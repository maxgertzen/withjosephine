import { scheduleListenedAtMirror } from "@/lib/booking/submissions";

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

  return proxySanityAsset(upstream, { contentDisposition: "inline" });
}
