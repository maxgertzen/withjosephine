import { forwardRangeHeader, gateListenAssetRequest, proxySanityAsset } from "../proxySanityAsset";

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

  return proxySanityAsset(upstream, {
    contentDisposition: 'attachment; filename="reading.pdf"',
  });
}
