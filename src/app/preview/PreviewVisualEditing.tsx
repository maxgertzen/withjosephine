"use client";

import { useRouter } from "next/navigation";
import { VisualEditing } from "next-sanity/visual-editing";
import { useCallback } from "react";

export function PreviewVisualEditing() {
  const router = useRouter();
  const refreshOnEveryEdit = useCallback(async () => {
    router.refresh();
  }, [router]);
  return <VisualEditing refresh={refreshOnEveryEdit} />;
}
