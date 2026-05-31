import { cookies } from "next/headers";

import {
  MY_GIFTS_PAGE_DEFAULTS,
  MY_READINGS_PAGE_DEFAULTS,
  type MyGiftsPageContent,
  type MyReadingsPageContent,
} from "@/data/defaults";
import { COOKIE_NAME, getActiveSession } from "@/lib/auth/listenSession";
import {
  listGiftsByPurchaserUserId,
  listSubmissionsByRecipientUserId,
} from "@/lib/booking/submissions";
import type { SubmissionRecord } from "@/lib/page-previews/types";
import { fetchMyGiftsPage, fetchMyReadingsPage } from "@/lib/sanity/fetch";
import { pickDefined } from "@/lib/sanity/pickDefined";

import type { LibraryViewState } from "./LibraryView";

export type LibraryPageData = {
  state: LibraryViewState;
  readingsCopy: MyReadingsPageContent;
  giftsCopy: MyGiftsPageContent;
};

/**
 * Data-loader for `/my-readings`. Parallel-fetches the cookie session, both
 * Sanity singletons, AND (when authenticated) both submission queries so the
 * page can render the stacked "Mine" + "For others" sections in one pass.
 */
export async function loadLibraryData(args: {
  justSent: boolean;
}): Promise<LibraryPageData> {
  const cookieStore = await cookies();
  const cookieValue = cookieStore.get(COOKIE_NAME)?.value ?? "";
  const [readingsSanity, giftsSanity, session] = await Promise.all([
    fetchMyReadingsPage(),
    fetchMyGiftsPage(),
    cookieValue ? getActiveSession({ cookieValue }) : Promise.resolve(null),
  ]);
  const readingsCopy: MyReadingsPageContent = {
    ...MY_READINGS_PAGE_DEFAULTS,
    ...pickDefined(readingsSanity ?? {}),
  };
  const giftsCopy: MyGiftsPageContent = {
    ...MY_GIFTS_PAGE_DEFAULTS,
    ...pickDefined(giftsSanity ?? {}),
  };

  const state = await resolveState({ session, justSent: args.justSent });
  return { state, readingsCopy, giftsCopy };
}

async function resolveState(args: {
  session: { userId: string; sessionId: string; elevatedAt: number | null } | null;
  justSent: boolean;
}): Promise<LibraryViewState> {
  if (args.session) {
    const [readings, gifts] = await Promise.all([
      listSubmissionsByRecipientUserId(args.session.userId),
      listGiftsByPurchaserUserId(args.session.userId),
    ]);
    return {
      kind: "list",
      readings: readings as SubmissionRecord[],
      gifts: gifts as SubmissionRecord[],
    };
  }
  if (args.justSent) return { kind: "checkEmail" };
  return { kind: "signIn" };
}
