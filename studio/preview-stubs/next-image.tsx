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

function resolveSrc(src: NextImageProps["src"]): string {
  if (typeof src === "string") return src;
  if ("default" in src) return src.default.src;
  return src.src;
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
