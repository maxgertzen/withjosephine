import { Suspense } from "react";

import { loadNotesNav } from "@/lib/notes/loadNotesNav";
import { notesNav } from "@/lib/notes/notesChrome";

import { Navigation } from "./Navigation";

async function LoadedSiteNavigation() {
  return <Navigation {...await loadNotesNav()} page="other" />;
}

export function SiteNavigation() {
  return (
    <Suspense fallback={<Navigation {...notesNav(null, null)} page="other" />}>
      <LoadedSiteNavigation />
    </Suspense>
  );
}
