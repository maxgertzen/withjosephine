import { MagicLinkEmailForm } from "@/components/Auth/MagicLinkEmailForm";
import { Button } from "@/components/Button";
import { CelestialOrb } from "@/components/CelestialOrb";
import { Footer } from "@/components/Footer";
import { GoldDivider } from "@/components/GoldDivider";
import { StarField } from "@/components/StarField";
import type { ListenPageContent } from "@/data/defaults";
import { PAGE_ORBS } from "@/lib/celestialPresets";
import { CONTACT_EMAIL } from "@/lib/constants";

function brandMailtoHref(subject: string, submissionId: string): string {
  const encodedSubject = encodeURIComponent(subject);
  const body = encodeURIComponent(`Reading ID: ${submissionId}`);
  return `mailto:${CONTACT_EMAIL}?subject=${encodedSubject}&body=${body}`;
}

export type ListenViewState =
  | {
      kind: "delivered";
      readingName: string;
      voiceNoteAudioPath: string | null;
      pdfDownloadPath: string | null;
      showWelcomeRibbon: boolean;
    }
  | { kind: "signIn"; submissionId: string }
  | { kind: "checkEmail"; submissionId: string }
  | { kind: "rested"; submissionId: string }
  | { kind: "throttled"; submissionId: string }
  | { kind: "assetTrouble"; submissionId: string };

export type ListenViewProps = {
  copy: ListenPageContent;
  state: ListenViewState;
};

export function ListenView({ copy, state }: ListenViewProps) {
  return (
    <div className="relative min-h-screen bg-j-cream overflow-hidden">
      <StarField count={30} className="opacity-[0.03]" />
      {PAGE_ORBS.map((orb, index) => (
        <CelestialOrb key={index} {...orb} />
      ))}

      <main className="relative z-10 max-w-[720px] mx-auto px-6 py-20">
        {renderCard(copy, state)}
        <Footer />
      </main>
    </div>
  );
}

function renderCard(copy: ListenPageContent, state: ListenViewState) {
  if (state.kind === "delivered") return <DeliveredSurface copy={copy} state={state} />;
  if (state.kind === "signIn") return <SignInCard copy={copy} submissionId={state.submissionId} />;
  if (state.kind === "checkEmail") return <CheckEmailCard copy={copy} submissionId={state.submissionId} />;
  if (state.kind === "rested") return <RestedCard copy={copy} submissionId={state.submissionId} />;
  if (state.kind === "throttled") return <ThrottledCard copy={copy} submissionId={state.submissionId} />;
  return <AssetTroubleCard copy={copy} submissionId={state.submissionId} />;
}

function fillTemplate(text: string, vars: { readingName: string }): string {
  return text.replaceAll("{readingName}", vars.readingName);
}

function DeliveredSurface({
  copy,
  state,
}: {
  copy: ListenPageContent;
  state: Extract<ListenViewState, { kind: "delivered" }>;
}) {
  const heading = fillTemplate(copy.deliveredHeading, { readingName: state.readingName });
  return (
    <>
      {state.showWelcomeRibbon ? (
        <p
          className="welcome-ribbon font-body text-xs tracking-[0.18em] uppercase text-j-text-muted text-center mb-6"
          aria-live="polite"
          data-testid="listen-welcome-ribbon"
        >
          {copy.welcomeRibbon}
        </p>
      ) : null}

      <header className="text-center">
        <h1 className="font-display italic text-[clamp(2rem,5vw,3rem)] font-medium text-j-text-heading leading-tight">
          {heading}
        </h1>
        <p className="font-display italic text-lg text-j-text-muted mt-4 max-w-md mx-auto">
          {copy.deliveredSubheading}
        </p>
      </header>

      <GoldDivider className="max-w-xs mx-auto my-12" />

      {state.voiceNoteAudioPath ? (
        <section className="mt-10">
          <h2 className="font-body text-xs tracking-[0.18em] uppercase text-j-text-muted mb-3">
            {copy.voiceNoteLabel}
          </h2>
          <audio controls preload="metadata" className="w-full" src={state.voiceNoteAudioPath}>
            Your browser does not support the audio element.
          </audio>
        </section>
      ) : null}

      {state.pdfDownloadPath ? (
        <section className="mt-12 text-center">
          <h2 className="font-body text-xs tracking-[0.18em] uppercase text-j-text-muted mb-4">
            {copy.pdfLabel}
          </h2>
          <Button href={state.pdfDownloadPath} variant="ghost" size="lg">
            {copy.pdfButtonLabel}
          </Button>
        </section>
      ) : null}

      <GoldDivider className="max-w-xs mx-auto my-12" />

      <p className="font-display italic text-base text-j-text max-w-prose mx-auto text-center">
        {copy.closerLine1}
      </p>

      <p className="font-display italic text-base text-j-text mt-6 text-center">
        {copy.closerLine2}
      </p>
    </>
  );
}

function SignInCard({ copy, submissionId }: { copy: ListenPageContent; submissionId: string }) {
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
        hiddenFields={{ next: `/listen/${submissionId}` }}
      />
      <p className="font-display italic text-base text-j-text-muted mt-8 text-center">
        {copy.signInFootnote}
      </p>
    </div>
  );
}

function CheckEmailCard({
  copy,
  submissionId,
}: {
  copy: ListenPageContent;
  submissionId: string;
}) {
  return (
    <div className="max-w-md mx-auto bg-j-ivory border border-j-blush rounded-2xl p-10 text-center">
      <h1 className="font-display italic text-3xl text-j-text-heading">
        {copy.checkEmailHeading}
      </h1>
      <p className="font-body text-base text-j-text mt-4 leading-[1.6]">{copy.checkEmailBody}</p>
      <p className="font-display italic text-base text-j-text-muted mt-8">
        <a href={`/listen/${submissionId}`} className="underline">
          {copy.checkEmailResendLabel}
        </a>
      </p>
    </div>
  );
}

function RestedCard({ copy, submissionId }: { copy: ListenPageContent; submissionId: string }) {
  return (
    <div className="max-w-md mx-auto bg-j-ivory border border-j-blush rounded-2xl p-10 text-center">
      <h1 className="font-display italic text-3xl text-j-text-heading">{copy.restedHeading}</h1>
      <p className="font-body text-base text-j-text mt-4 leading-[1.6]">{copy.restedBody}</p>
      <MagicLinkEmailForm
        action="/api/auth/magic-link"
        submitLabel={copy.restedCtaLabel}
        emailLabel="Email"
        hiddenFields={{ next: `/listen/${submissionId}` }}
      />
    </div>
  );
}

function ThrottledCard({
  copy,
  submissionId,
}: {
  copy: ListenPageContent;
  submissionId: string;
}) {
  return (
    <div className="max-w-md mx-auto bg-j-ivory border border-j-blush rounded-2xl p-10 text-center">
      <h1 className="font-display italic text-3xl text-j-text-heading">
        {copy.throttledHeading}
      </h1>
      <p className="font-body text-base text-j-text mt-4 leading-[1.6]">{copy.throttledBody}</p>
      <p className="font-display italic text-base text-j-text-muted mt-8">
        <a
          href={brandMailtoHref(copy.throttledMailtoSubject, submissionId)}
          className="underline"
        >
          {copy.throttledMailtoLabel}
        </a>
      </p>
    </div>
  );
}

function AssetTroubleCard({
  copy,
  submissionId,
}: {
  copy: ListenPageContent;
  submissionId: string;
}) {
  return (
    <div className="max-w-md mx-auto bg-j-ivory border border-j-blush rounded-2xl p-10 text-center">
      <h1 className="font-display italic text-3xl text-j-text-heading">
        {copy.assetTroubleHeading}
      </h1>
      <p className="font-body text-base text-j-text mt-4 leading-[1.6]">
        {copy.assetTroubleBody}
      </p>
      <div className="mt-8 flex flex-col gap-4 items-center">
        <Button href={`/listen/${submissionId}`} size="lg" className="w-full">
          {copy.assetTroubleTryAgainLabel}
        </Button>
        <p className="font-display italic text-base text-j-text-muted">
          <a
            href={brandMailtoHref(copy.assetTroubleMailtoSubject, submissionId)}
            className="underline"
          >
            {copy.assetTroubleMailtoLabel}
          </a>
        </p>
      </div>
    </div>
  );
}
