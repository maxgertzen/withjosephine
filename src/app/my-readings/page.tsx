import type { Metadata } from "next";
import { cookies } from "next/headers";

import { MY_READINGS_PAGE_DEFAULTS } from "@/data/defaults";
import { COOKIE_NAME, getActiveSession } from "@/lib/auth/listenSession";
import { listSubmissionsByRecipientUserId } from "@/lib/booking/submissions";
import { fetchMyReadingsPage } from "@/lib/sanity/fetch";

import { MyReadingsView, type MyReadingsViewProps } from "./MyReadingsView";

export const metadata: Metadata = {
  title: "Your readings — Josephine",
  description: "Your readings, gathered in one quiet place.",
  robots: { index: false, follow: false },
};

export default async function MyReadingsPage({
  searchParams,
}: {
  searchParams: Promise<{ sent?: string }>;
}) {
  const cookieStore = await cookies();
  const cookieValue = cookieStore.get(COOKIE_NAME)?.value ?? "";
  const [params, sanity, session] = await Promise.all([
    searchParams,
    fetchMyReadingsPage(),
    cookieValue ? getActiveSession({ cookieValue }) : Promise.resolve(null),
  ]);
  const copy = { ...MY_READINGS_PAGE_DEFAULTS, ...(sanity ?? {}) };
  const state = await resolveState({ session, justSent: params.sent === "1" });
  return <MyReadingsView copy={copy} state={state} />;
}

async function resolveState(args: {
  session: { userId: string; sessionId: string } | null;
  justSent: boolean;
}): Promise<MyReadingsViewProps["state"]> {
  if (args.session) {
    const readings = await listSubmissionsByRecipientUserId(args.session.userId);
    return { kind: "list", readings };
  }
  if (args.justSent) return { kind: "checkEmail" };
  return { kind: "signIn" };
}
