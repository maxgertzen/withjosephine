"use client";

import { useState } from "react";

import { mergeClasses } from "@/lib/utils";

type PdfThumbnailProps = {
  downloadHref: string;
  downloadLabel: string;
  thumbnailSrc?: string | null;
  readingName?: string | null;
  className?: string;
};

const PLACEHOLDER_LINE_WIDTHS = ["w-4/5", "w-full", "w-11/12", "w-full", "w-3/4"] as const;

// Overlay is always shown on mobile, hover/focus-revealed on desktop. Falls back
// to a styled page when no thumbnail resolves (generation failed / legacy doc).
export function PdfThumbnail({
  downloadHref,
  downloadLabel,
  thumbnailSrc,
  readingName,
  className,
}: PdfThumbnailProps) {
  const [imageFailed, setImageFailed] = useState(false);
  const showImage = Boolean(thumbnailSrc) && !imageFailed;

  return (
    <a
      href={downloadHref}
      download
      aria-label={downloadLabel}
      className={mergeClasses(
        "group relative mx-auto block aspect-[1/1.414] w-60 max-w-full overflow-hidden rounded-md",
        "border border-j-blush bg-j-ivory shadow-[0_12px_34px_-14px_rgba(13,11,26,0.4)]",
        "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-j-accent",
        className,
      )}
    >
      {showImage ? (
        // eslint-disable-next-line @next/next/no-img-element -- images.unoptimized; src is an auth-gated stream route, not a static asset
        <img
          src={thumbnailSrc as string}
          alt=""
          onError={() => setImageFailed(true)}
          className="h-full w-full object-cover object-top"
        />
      ) : (
        <div className="flex h-full w-full flex-col items-center px-6 pt-8 pb-6 text-center">
          <span aria-hidden className="font-display text-lg text-j-accent">
            ✦
          </span>
          <p className="mt-3 font-display italic text-base leading-snug text-j-text-heading">
            {readingName ?? "Your reading"}
          </p>
          <div className="mt-6 flex w-full flex-col items-center gap-2">
            {PLACEHOLDER_LINE_WIDTHS.map((width, index) => (
              <span
                key={index}
                className={mergeClasses("block h-[3px] rounded-full bg-j-blush/60", width)}
              />
            ))}
          </div>
        </div>
      )}

      <span
        className={mergeClasses(
          "pointer-events-none absolute inset-0 flex items-end justify-center pb-5",
          "bg-gradient-to-t from-black/70 via-black/15 to-transparent",
          "opacity-100 transition-opacity duration-300 motion-reduce:transition-none",
          "md:opacity-0 md:group-hover:opacity-100 md:group-focus-visible:opacity-100",
        )}
      >
        <span className="inline-flex items-center gap-2 font-body text-[0.72rem] font-medium uppercase tracking-[0.16em] text-j-text-on-dark drop-shadow-[0_1px_2px_rgba(0,0,0,0.5)]">
          <svg
            aria-hidden
            viewBox="0 0 16 16"
            className="h-3.5 w-3.5"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.4"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M8 2.5v8" />
            <path d="M4.5 7 8 10.5 11.5 7" />
            <path d="M3 13h10" />
          </svg>
          {downloadLabel}
        </span>
      </span>
    </a>
  );
}
