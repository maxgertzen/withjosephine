import type { Metadata } from "next";

import { MY_GIFTS_PAGE_DEFAULTS } from "@/data/defaults";
import { fetchMyGiftsPage } from "@/lib/sanity/fetch";

import { MyGiftsView, type MyGiftsViewProps } from "../../my-gifts/MyGiftsView";
import { PreviewStateSwitcher } from "../_components/PreviewStateSwitcher";
import {
  MY_GIFTS_PREVIEW_STATES,
  type MyGiftsPreviewState,
  parseMyGiftsState,
  PREVIEW_GIFTS_MIX,
} from "../_fixtures";

export const metadata: Metadata = {
  title: "My Gifts — Preview",
  robots: { index: false, follow: false },
};

function buildState(kind: MyGiftsPreviewState): MyGiftsViewProps["state"] {
  if (kind === "signIn") return { kind: "signIn" };
  if (kind === "checkEmail") return { kind: "checkEmail" };
  return { kind: "list", gifts: PREVIEW_GIFTS_MIX };
}

export default async function MyGiftsPreviewPage({
  searchParams,
}: {
  searchParams: Promise<{ state?: string }>;
}) {
  const [params, sanity] = await Promise.all([
    searchParams,
    fetchMyGiftsPage().catch(() => null),
  ]);
  const copy = { ...MY_GIFTS_PAGE_DEFAULTS, ...(sanity ?? {}) };
  const stateKind = parseMyGiftsState(params.state);

  return (
    <>
      <PreviewStateSwitcher
        title="My Gifts"
        basePath="/preview/my-gifts"
        states={MY_GIFTS_PREVIEW_STATES}
        current={stateKind}
      />
      <MyGiftsView copy={copy} state={buildState(stateKind)} />
    </>
  );
}
