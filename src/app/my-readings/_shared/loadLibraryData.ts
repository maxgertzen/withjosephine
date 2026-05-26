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

import type { LibraryViewState } from "./LibraryView";

export type LibraryPageData = {
  state: LibraryViewState;
  readingsCopy: MyReadingsPageContent;
  giftsCopy: MyGiftsPageContent;
};

/**
 * Single data-loader shared by `/my-readings/page.tsx` (defaultTab=readings)
 * and `/my-readings/gifts/page.tsx` (defaultTab=gifts). Parallel-fetches the
 * cookie session, both Sanity singletons, AND (when authenticated) both
 * submission queries so the unified page can render both tab panels.
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
    ...(readingsSanity ?? {}),
  };
  const giftsCopy: MyGiftsPageContent = {
    ...MY_GIFTS_PAGE_DEFAULTS,
    ...(giftsSanity ?? {}),
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

export function pickDefaultTab(state: LibraryViewState): "readings" | "gifts" {
  if (state.kind !== "list") return "readings";
  if (state.readings.length === 0 && state.gifts.length > 0) return "gifts";
  return "readings";
}
