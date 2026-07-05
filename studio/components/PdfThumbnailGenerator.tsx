import { useEffect, useRef } from "react";
import { type FileValue, type ObjectInputProps, useClient, useFormValue } from "sanity";

import { renderPdfFirstPageToPngBlob } from "../lib/renderPdfThumbnail";

const API_VERSION = "2025-01-01";

// On PDF upload/replace, rasterizes page 1 and patches the sibling `pdfThumbnail`
// + `pdfThumbnailSourceRef`. Keyed off the source ref so an existing thumbnail is
// never rebuilt on reload (and would-be loop is broken) but a replaced PDF is.
// Failures log and no-op — the listen page falls back to a placeholder.
export function PdfThumbnailGenerator(props: ObjectInputProps<FileValue>) {
  const client = useClient({ apiVersion: API_VERSION });
  const documentId = useFormValue(["_id"]) as string | undefined;
  const sourceRef = useFormValue(["pdfThumbnailSourceRef"]) as string | undefined;
  const assetRef = props.value?.asset?._ref;
  const busyRef = useRef(false);

  useEffect(() => {
    if (!documentId || !assetRef) return;
    if (assetRef === sourceRef) return;
    if (busyRef.current) return;
    busyRef.current = true;
    let cancelled = false;

    void (async () => {
      try {
        const fileAsset = await client.getDocument(assetRef);
        const url = (fileAsset as { url?: string } | null)?.url;
        if (!url) return;
        const blob = await renderPdfFirstPageToPngBlob(url);
        const uploaded = await client.assets.upload("image", blob, {
          filename: "reading-pdf-thumbnail.png",
        });
        if (cancelled) return;
        await client
          .patch(documentId)
          .set({
            pdfThumbnail: {
              _type: "image",
              asset: { _type: "reference", _ref: uploaded._id },
            },
            pdfThumbnailSourceRef: assetRef,
          })
          .commit();
      } catch (error) {
        console.error("[pdf-thumbnail] auto-generation failed", error);
      } finally {
        busyRef.current = false;
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [assetRef, sourceRef, documentId, client]);

  return props.renderDefault(props);
}
