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

const PREVIEW_ASSET_ORIGIN = "https://withjosephine.com";

function resolveSrc(src: NextImageProps["src"]): string {
  const raw =
    typeof src === "string"
      ? src
      : "default" in src
        ? src.default.src
        : src.src;
  if (raw.startsWith("/") && !raw.startsWith("//")) {
    return `${PREVIEW_ASSET_ORIGIN}${raw}`;
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
