// pdfjs is imported lazily so the Studio only loads it when a PDF is actually
// uploaded (and so importing the schema in a non-Vite context never pulls the
// worker `?url` asset).
const TARGET_WIDTH = 800;

export async function renderPdfFirstPageToPngBlob(pdfUrl: string): Promise<Blob> {
  const pdfjs = await import("pdfjs-dist");
  const workerUrl = (await import("pdfjs-dist/build/pdf.worker.min.mjs?url")).default;
  pdfjs.GlobalWorkerOptions.workerSrc = workerUrl;

  const doc = await pdfjs.getDocument({ url: pdfUrl }).promise;
  try {
    const page = await doc.getPage(1);
    const unscaled = page.getViewport({ scale: 1 });
    const viewport = page.getViewport({ scale: TARGET_WIDTH / unscaled.width });

    const canvas = document.createElement("canvas");
    canvas.width = Math.ceil(viewport.width);
    canvas.height = Math.ceil(viewport.height);
    const canvasContext = canvas.getContext("2d");
    if (!canvasContext) throw new Error("2d canvas context unavailable");

    await page.render({ canvasContext, viewport }).promise;

    return await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob(
        (blob) => (blob ? resolve(blob) : reject(new Error("canvas.toBlob returned null"))),
        "image/png",
      );
    });
  } finally {
    await doc.destroy();
  }
}
