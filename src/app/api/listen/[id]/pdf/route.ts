import { schedulePdfDownloadedAtMirror } from "@/lib/booking/submissions";

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
  if (!gate.asset.pdfUrl) return new Response("Not found", { status: 404 });

  const upstream = await fetch(gate.asset.pdfUrl, {
    headers: forwardRangeHeader(request),
  });

  if (upstream.ok && isFirstByteRequest(request)) {
    schedulePdfDownloadedAtMirror(id, new Date().toISOString());
  }

  const filename = buildListenFilename({
    firstName: gate.asset.firstName,
    lastName: gate.asset.lastName,
    readingName: gate.asset.readingName,
    readingSlug: gate.asset.readingSlug,
    submissionId: gate.asset.submissionId,
    sourceUrl: gate.asset.pdfUrl,
    kind: "reading",
  });
  return proxySanityAsset(upstream, {
    contentDisposition: buildContentDisposition({ type: "attachment", filename }),
  });
}
