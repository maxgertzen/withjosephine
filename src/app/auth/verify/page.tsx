import type { Metadata } from "next";

import { MAGIC_LINK_VERIFY_PAGE_DEFAULTS } from "@/data/defaults";
import { safeNext } from "@/lib/auth/safeNext";
import { fetchMagicLinkVerifyPage } from "@/lib/sanity/fetch";

import { VerifyPageView } from "./VerifyPageView";

export const metadata: Metadata = {
  title: "Open your reading — Josephine",
  description: "Confirm your email to open your reading.",
  robots: { index: false, follow: false },
};

export default async function VerifyPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string; next?: string; error?: string }>;
}) {
  const [params, sanity] = await Promise.all([searchParams, fetchMagicLinkVerifyPage().catch(() => null)]);
  const copy = { ...MAGIC_LINK_VERIFY_PAGE_DEFAULTS, ...(sanity ?? {}) };
  const token = params.token ?? "";
  const next = safeNext(params.next);
  const showRested = params.error === "rested" || !token;
  const state = showRested ? { kind: "rested" as const } : { kind: "confirm" as const, token, next };

  return <VerifyPageView copy={copy} state={state} />;
}
