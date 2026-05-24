import type { Metadata } from "next";

import { MY_READINGS_PAGE_DEFAULTS } from "@/data/defaults";
import { fetchMyReadingsPage } from "@/lib/sanity/fetch";

import { MyReadingsView, type MyReadingsViewProps } from "../../my-readings/MyReadingsView";
import { PreviewStateSwitcher } from "../_components/PreviewStateSwitcher";
import {
  MY_READINGS_PREVIEW_STATES,
  type MyReadingsPreviewState,
  parseMyReadingsState,
  PREVIEW_READINGS_MIX,
} from "../_fixtures";

export const metadata: Metadata = {
  title: "My Readings — Preview",
  robots: { index: false, follow: false },
};

function buildState(kind: MyReadingsPreviewState): MyReadingsViewProps["state"] {
  if (kind === "signIn") return { kind: "signIn" };
  if (kind === "checkEmail") return { kind: "checkEmail" };
  return { kind: "list", readings: PREVIEW_READINGS_MIX };
}

export default async function MyReadingsPreviewPage({
  searchParams,
}: {
  searchParams: Promise<{ state?: string }>;
}) {
  const [params, sanity] = await Promise.all([
    searchParams,
    fetchMyReadingsPage().catch(() => null),
  ]);
  const copy = { ...MY_READINGS_PAGE_DEFAULTS, ...(sanity ?? {}) };
  const stateKind = parseMyReadingsState(params.state);

  return (
    <>
      <PreviewStateSwitcher
        title="My Readings"
        basePath="/preview/my-readings"
        states={MY_READINGS_PREVIEW_STATES}
        current={stateKind}
      />
      <MyReadingsView copy={copy} state={buildState(stateKind)} />
    </>
  );
}
