import { useState } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import type { PreviewProps } from "sanity";

import { NotePlate } from "@/components/Notes/NotePlate";
import type { NotePlateValue } from "@/lib/notes/types";
import { wrapHtmlDocument } from "@/lib/page-previews/render-preview-pages";

import { PREVIEW_STYLES } from "../.generated/preview-styles";

type PlatePreviewProps = PreviewProps &
  Partial<Omit<NotePlateValue, "_type" | "layout">> & { plateLayout?: NotePlateValue["layout"] };

export function NotePlatePreview({
  label,
  plateLayout,
  leftHeading,
  leftLines,
  rightHeading,
  rightLines,
}: PlatePreviewProps) {
  const [height, setHeight] = useState(160);
  const plate: NotePlateValue = {
    _type: "notePlate",
    label: label || "Plate",
    layout: plateLayout,
    leftHeading,
    leftLines,
    rightHeading,
    rightLines,
  };
  const markup = renderToStaticMarkup(
    <div className="flow-root bg-j-cream px-4">
      <NotePlate plate={plate} />
    </div>,
  );

  return (
    <iframe
      srcDoc={wrapHtmlDocument(markup, PREVIEW_STYLES)}
      title={`Plate preview: ${plate.label}`}
      sandbox="allow-same-origin"
      onLoad={(event) => {
        const body = event.currentTarget.contentDocument?.body;
        if (body) setHeight(body.scrollHeight);
      }}
      style={{ display: "block", width: "100%", height, border: "none", pointerEvents: "none" }}
    />
  );
}
