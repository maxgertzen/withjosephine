import { getSanityFreshReadClient } from "@/lib/sanity/client";

import { gateListenAssetRequest, proxySanityAsset } from "../proxySanityAsset";

// The first page reveals reading content, so gate it like the pdf/audio streams.
// Resolved from Sanity by id (one image, not a Range stream) so no D1 mirror.
const THUMBNAIL_URL_GROQ = `*[_type == "submission" && _id == $id][0].pdfThumbnail.asset->url`;

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const gate = await gateListenAssetRequest(request, id);
  if (!gate.ok) return gate.response;

  const client = await getSanityFreshReadClient();
  const thumbnailUrl = await client.fetch<string | null>(THUMBNAIL_URL_GROQ, { id });
  if (!thumbnailUrl) return new Response("Not found", { status: 404 });

  const upstream = await fetch(thumbnailUrl);
  if (!upstream.ok) return new Response("Not found", { status: 404 });

  return proxySanityAsset(upstream, { contentDisposition: "inline" });
}
