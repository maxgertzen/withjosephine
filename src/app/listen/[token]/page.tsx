import type { Metadata } from "next";
import { headers } from "next/headers";
import { notFound } from "next/navigation";

import { Button } from "@/components/Button";
import { CelestialOrb } from "@/components/CelestialOrb";
import { Footer } from "@/components/Footer";
import { GoldDivider } from "@/components/GoldDivider";
import { StarField } from "@/components/StarField";
import { serverTrack } from "@/lib/analytics/server";
import { findSubmissionById } from "@/lib/booking/submissions";
import { PAGE_ORBS } from "@/lib/celestialPresets";
import { verifyListenToken } from "@/lib/listenToken";

export const metadata: Metadata = {
  title: "Your reading — Josephine",
  description: "Listen to your reading and download the supporting PDF.",
  robots: { index: false, follow: false },
};

type ListenPageProps = {
  params: Promise<{ token: string }>;
};

export default async function ListenPage({ params }: ListenPageProps) {
  const { token } = await params;
  const verified = await verifyListenToken(token);
  if (!verified.valid) notFound();

  const submission = await findSubmissionById(verified.submissionId);
  if (!submission) notFound();
  if (submission.status !== "paid") notFound();
  if (!submission.deliveredAt) notFound();
  if (!submission.voiceNoteUrl && !submission.pdfUrl) notFound();

  const userAgent = (await headers()).get("user-agent") ?? undefined;
  void serverTrack(
    "delivery_listened",
    {
      distinct_id: submission._id,
      submission_id: submission._id,
      reading_id: submission.reading?.slug ?? "",
    },
    { userAgent },
  );

  const readingName = submission.reading?.name ?? "your reading";

  return (
    <div className="relative min-h-screen bg-j-cream overflow-hidden">
      <StarField count={30} className="opacity-[0.03]" />
      {PAGE_ORBS.map((orb, index) => (
        <CelestialOrb key={index} {...orb} />
      ))}

      <main className="relative z-10 max-w-[720px] mx-auto px-6 py-20">
        <header className="text-center">
          <h1 className="font-display italic text-[clamp(2rem,5vw,3rem)] font-medium text-j-text-heading leading-tight">
            Your {readingName} is ready
          </h1>
          <p className="font-display italic text-lg text-j-text-muted mt-4 max-w-md mx-auto">
            Best with headphones, somewhere quiet.
          </p>
        </header>

        <GoldDivider className="max-w-xs mx-auto my-12" />

        {submission.voiceNoteUrl && (
          <section className="mt-10">
            <h2 className="font-body text-xs tracking-[0.18em] uppercase text-j-text-muted mb-3">
              Voice note
            </h2>
            <audio
              controls
              preload="metadata"
              className="w-full"
              src={submission.voiceNoteUrl}
            >
              Your browser does not support the audio element.
            </audio>
          </section>
        )}

        {submission.pdfUrl && (
          <section className="mt-12 text-center">
            <h2 className="font-body text-xs tracking-[0.18em] uppercase text-j-text-muted mb-4">
              Supporting PDF
            </h2>
            <Button href={submission.pdfUrl} variant="ghost" size="lg">
              Download PDF
            </Button>
          </section>
        )}

        <GoldDivider className="max-w-xs mx-auto my-12" />

        <p className="font-display italic text-base text-j-text max-w-prose mx-auto text-center">
          If anything you hear sits hard, or if a question opens up after, please write to me.
          I&rsquo;d rather know than not.
        </p>

        <p className="font-display italic text-base text-j-text mt-6 text-center">
          With love, Josephine ✦
        </p>
      </main>

      <Footer />
    </div>
  );
}
