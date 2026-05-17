import type { Metadata } from "next";
import { cookies } from "next/headers";

import { MY_GIFTS_PAGE_DEFAULTS } from "@/data/defaults";
import { COOKIE_NAME, getActiveSession } from "@/lib/auth/listenSession";
import { listGiftsByPurchaserUserId } from "@/lib/booking/submissions";
import { fetchMyGiftsPage } from "@/lib/sanity/fetch";

import { MyGiftsView, type MyGiftsViewProps } from "./MyGiftsView";

export const metadata: Metadata = {
  title: "Your gifts — Josephine",
  description: "Every reading you’ve sent, gathered in one quiet place.",
  robots: { index: false, follow: false },
};

export default async function MyGiftsPage({
  searchParams,
}: {
  searchParams: Promise<{ sent?: string }>;
}) {
  const cookieStore = await cookies();
  const cookieValue = cookieStore.get(COOKIE_NAME)?.value ?? "";
  const [params, sanity, session] = await Promise.all([
    searchParams,
    fetchMyGiftsPage(),
    cookieValue ? getActiveSession({ cookieValue }) : Promise.resolve(null),
  ]);
  const copy = { ...MY_GIFTS_PAGE_DEFAULTS, ...(sanity ?? {}) };
  const state = await resolveState({ session, justSent: params.sent === "1" });
  return <MyGiftsView copy={copy} state={state} />;
}

async function resolveState(args: {
  session: { userId: string; sessionId: string } | null;
  justSent: boolean;
}): Promise<MyGiftsViewProps["state"]> {
  if (args.session) {
    const gifts = await listGiftsByPurchaserUserId(args.session.userId);
    return { kind: "list", gifts };
  }
  if (args.justSent) return { kind: "checkEmail" };
  return { kind: "signIn" };
}
