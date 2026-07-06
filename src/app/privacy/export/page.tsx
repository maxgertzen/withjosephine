import type { Metadata } from "next";

import { PrivacyExportView } from "./PrivacyExportView";

type PrivacyExportSearchParams = {
  t?: string | string[];
};

type PrivacyExportPageProps = {
  searchParams: Promise<PrivacyExportSearchParams>;
};

export const metadata: Metadata = {
  title: "Request your data export | Josephine",
  description:
    "Download the data we hold for your reading. Your right under GDPR.",
  robots: { index: false, follow: false },
};

export default async function PrivacyExportPage({ searchParams }: PrivacyExportPageProps) {
  const { t } = await searchParams;
  const token = typeof t === "string" ? t : null;

  return <PrivacyExportView token={token} />;
}
