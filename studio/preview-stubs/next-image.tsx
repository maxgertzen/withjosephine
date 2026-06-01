import type { CSSProperties, ImgHTMLAttributes } from "react";

type NextImageProps = ImgHTMLAttributes<HTMLImageElement> & {
  src: string | { src: string } | { default: { src: string } };
  alt: string;
  width?: number | string;
  height?: number | string;
  priority?: boolean;
  unoptimized?: boolean;
  placeholder?: string;
  blurDataURL?: string;
  fill?: boolean;
  sizes?: string;
  quality?: number;
};

// Public-origin static assets are blocked from loading inside the
// sandboxed iframe by Cross-Origin-Resource-Policy: same-origin. Swap
// the src for a tiny transparent placeholder so the layout (width /
// height / opacity) is preserved without a broken-image icon. Data
// URLs are not subject to CORP and load synchronously.
const TRANSPARENT_PIXEL =
  "data:image/svg+xml;utf8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%2F%3E";

type ResolvedSrc = { src: string; swapped: boolean };

export function resolveSrc(src: NextImageProps["src"]): ResolvedSrc {
  const raw =
    typeof src === "string"
      ? src
      : "default" in src
        ? src.default.src
        : src.src;
  if (raw.startsWith("/") && !raw.startsWith("//")) {
    return { src: TRANSPARENT_PIXEL, swapped: true };
  }
  return { src: raw, swapped: false };
}

const BADGE_STYLE: CSSProperties = {
  position: "absolute",
  inset: 0,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  background: "rgba(13, 11, 26, 0.62)",
  color: "#F5F0E8",
  fontFamily: "system-ui, sans-serif",
  fontSize: "11px",
  letterSpacing: "0.04em",
  textAlign: "center",
  padding: "0.5rem",
  pointerEvents: "none",
};

const BADGE_WRAPPER_STYLE: CSSProperties = {
  position: "relative",
  display: "inline-block",
};

export default function Image({
  src,
  alt,
  width,
  height,
  priority: _priority,
  unoptimized: _unoptimized,
  placeholder: _placeholder,
  blurDataURL: _blurDataURL,
  fill,
  sizes: _sizes,
  quality: _quality,
  style,
  ...rest
}: NextImageProps) {
  const resolved = resolveSrc(src);
  const finalStyle = fill
    ? { position: "absolute" as const, inset: 0, width: "100%", height: "100%", ...style }
    : style;
  const img = (
    <img
      src={resolved.src}
      alt={alt}
      width={width as number | undefined}
      height={height as number | undefined}
      style={finalStyle}
      {...rest}
    />
  );
  if (!resolved.swapped) return img;
  const wrapperStyle: CSSProperties = fill
    ? { position: "absolute", inset: 0 }
    : BADGE_WRAPPER_STYLE;
  return (
    <span style={wrapperStyle} data-preview-image-hidden="true">
      {img}
      <span style={BADGE_STYLE}>Image hidden in preview, view live</span>
    </span>
  );
}
