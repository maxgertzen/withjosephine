import { Suspense } from "react";

import { loadSiteChrome } from "@/lib/notes/loadSiteChrome";
import { notesNav } from "@/lib/notes/notesChrome";
import type { ContentPerspective } from "@/lib/sanity/types";

import { Navigation } from "./Navigation";

type SiteNavigationProps = { perspective?: ContentPerspective };

async function LoadedSiteNavigation({ perspective }: SiteNavigationProps) {
  return <Navigation {...(await loadSiteChrome(perspective)).nav} page="other" />;
}

export function SiteNavigation({ perspective }: SiteNavigationProps) {
  return (
    <Suspense fallback={<Navigation {...notesNav(null, null)} page="other" />}>
      <LoadedSiteNavigation perspective={perspective} />
    </Suspense>
  );
}
