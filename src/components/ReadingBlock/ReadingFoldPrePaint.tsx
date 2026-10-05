"use client";

import { useIsClient } from "@/lib/hooks/useIsClient";
import { readingFoldPrePaintScript } from "@/lib/intake/readingFoldPrePaint";

export function ReadingFoldPrePaint({ slug }: { slug: string }) {
  const hydrated = useIsClient();
  if (hydrated) return null;
  return <script dangerouslySetInnerHTML={{ __html: readingFoldPrePaintScript(slug) }} />;
}
