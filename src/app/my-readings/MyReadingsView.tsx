import { format, parseISO } from "date-fns";

import { MagicLinkEmailForm } from "@/components/Auth/MagicLinkEmailForm";
import { Button } from "@/components/Button";
import { CelestialOrb } from "@/components/CelestialOrb";
import { Footer } from "@/components/Footer";
import { GoldDivider } from "@/components/GoldDivider";
import { StarField } from "@/components/StarField";
import type { MyReadingsPageContent } from "@/data/defaults";
import type { SubmissionRecord } from "@/lib/booking/submissions";
import { PAGE_ORBS } from "@/lib/celestialPresets";

export type MyReadingsViewProps = {
  copy: MyReadingsPageContent;
  state:
    | { kind: "list"; readings: SubmissionRecord[] }
    | { kind: "signIn" }
    | { kind: "checkEmail" };
};

export function MyReadingsView({ copy, state }: MyReadingsViewProps) {
  return (
    <div className="relative min-h-screen bg-j-cream overflow-hidden">
      <StarField count={30} className="opacity-[0.03]" />
      {PAGE_ORBS.map((orb, index) => (
        <CelestialOrb key={index} {...orb} />
      ))}

      <main className="relative z-10 max-w-[720px] mx-auto px-6 py-20">
        {state.kind === "list" ? (
          <ReadingsList readings={state.readings} copy={copy} />
        ) : state.kind === "checkEmail" ? (
          <CheckYourEmailCard copy={copy} />
        ) : (
          <SignInCard copy={copy} />
        )}
        <Footer />
      </main>
    </div>
  );
}

function ReadingsList({
  readings,
  copy,
}: {
  readings: SubmissionRecord[];
  copy: MyReadingsPageContent;
}) {
  return (
    <>
      <header className="text-center">
        <h1 className="font-display italic text-[clamp(2rem,5vw,3rem)] font-medium text-j-text-heading leading-tight">
          {copy.listHeading}
        </h1>
        <p className="font-display italic text-lg text-j-text-muted mt-4 max-w-md mx-auto">
          {copy.listSubheading}
        </p>
      </header>
      <GoldDivider className="max-w-xs mx-auto my-12" />
      {readings.length === 0 ? (
        <EmptyState copy={copy} />
      ) : (
        <Cards readings={readings} openLabel={copy.openButtonLabel} />
      )}
    </>
  );
}

function Cards({ readings, openLabel }: { readings: SubmissionRecord[]; openLabel: string }) {
  return (
    <ul className="space-y-6">
      {readings.map((reading) => (
        <li
          key={reading._id}
          className="border border-j-blush rounded-2xl bg-j-ivory px-8 py-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"
        >
          <div>
            <h2 className="font-display italic text-xl text-j-text-heading">
              {reading.reading?.name ?? "Your reading"}
            </h2>
            <p className="font-body text-sm text-j-text-muted mt-1">
              Delivered {formatDate(reading.deliveredAt ?? reading.createdAt)}
            </p>
          </div>
          <Button href={`/listen/${reading._id}`}>
            {openLabel}
          </Button>
        </li>
      ))}
    </ul>
  );
}

function EmptyState({ copy }: { copy: MyReadingsPageContent }) {
  return (
    <div className="text-center">
      <p className="font-display italic text-lg text-j-text mt-8 max-w-md mx-auto">
        {copy.emptyHeading}
      </p>
      <div className="mt-10">
        <Button href="/book" size="lg">
          {copy.emptyCtaLabel}
        </Button>
      </div>
    </div>
  );
}

function SignInCard({ copy }: { copy: MyReadingsPageContent }) {
  return (
    <div className="max-w-md mx-auto bg-j-ivory border border-j-blush rounded-2xl p-10">
      <h1 className="font-display italic text-3xl text-j-text-heading text-center">
        {copy.signInHeading}
      </h1>
      <p className="font-body text-base text-j-text mt-4 text-center leading-[1.6]">
        {copy.signInBody}
      </p>
      <MagicLinkEmailForm
        action="/api/auth/magic-link"
        submitLabel={copy.signInButtonLabel}
        emailLabel="Email"
      />
      <p className="font-display italic text-base text-j-text-muted mt-8 text-center">
        {copy.signInFootnote}
      </p>
    </div>
  );
}

function CheckYourEmailCard({ copy }: { copy: MyReadingsPageContent }) {
  return (
    <div className="max-w-md mx-auto bg-j-ivory border border-j-blush rounded-2xl p-10 text-center">
      <h1 className="font-display italic text-3xl text-j-text-heading">
        {copy.checkEmailHeading}
      </h1>
      <p className="font-body text-base text-j-text mt-4 leading-[1.6]">
        {copy.checkEmailBody}
      </p>
      <p className="font-display italic text-base text-j-text-muted mt-8">
        <a href="/my-readings" className="underline">
          {copy.checkEmailResendLabel}
        </a>
      </p>
    </div>
  );
}

function formatDate(iso: string): string {
  return format(parseISO(iso), "MMMM d, yyyy");
}
