import type { ImgHTMLAttributes } from "react";

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

function resolveSrc(src: NextImageProps["src"]): string {
  const raw =
    typeof src === "string"
      ? src
      : "default" in src
        ? src.default.src
        : src.src;
  if (raw.startsWith("/") && !raw.startsWith("//")) {
    return TRANSPARENT_PIXEL;
  }
  return raw;
}

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
  return (
    <img
      src={resolved}
      alt={alt}
      width={width as number | undefined}
      height={height as number | undefined}
      style={finalStyle}
      {...rest}
    />
  );
}
