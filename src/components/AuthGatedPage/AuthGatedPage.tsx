import { MagicLinkEmailForm } from "@/components/Auth/MagicLinkEmailForm";
import type { AuthGatedPageContent } from "@/data/defaults";

type Props = {
  state: "signIn" | "checkEmail";
  copy: AuthGatedPageContent;
  /** Optional `next` redirect target passed to the magic-link form as a hidden field. */
  magicLinkNext?: string;
  /** Anchor target on the check-email "send another" link. */
  resendHref: string;
};

export function AuthGatedPage({ state, copy, magicLinkNext, resendHref }: Props) {
  if (state === "checkEmail") {
    return <CheckYourEmailCard copy={copy} resendHref={resendHref} />;
  }
  return <SignInCard copy={copy} magicLinkNext={magicLinkNext} />;
}

function SignInCard({
  copy,
  magicLinkNext,
}: {
  copy: AuthGatedPageContent;
  magicLinkNext?: string;
}) {
  const hiddenFields = magicLinkNext ? { next: magicLinkNext } : undefined;
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
        hiddenFields={hiddenFields}
      />
      <p className="font-display italic text-base text-j-text-muted mt-8 text-center">
        {copy.signInFootnote}
      </p>
    </div>
  );
}

function CheckYourEmailCard({
  copy,
  resendHref,
}: {
  copy: AuthGatedPageContent;
  resendHref: string;
}) {
  return (
    <div className="max-w-md mx-auto bg-j-ivory border border-j-blush rounded-2xl p-10 text-center">
      <h1 className="font-display italic text-3xl text-j-text-heading">
        {copy.checkEmailHeading}
      </h1>
      <p className="font-body text-base text-j-text mt-4 leading-[1.6]">
        {copy.checkEmailBody}
      </p>
      <p className="font-display italic text-base text-j-text-muted mt-8">
        <a href={resendHref} className="underline">
          {copy.checkEmailResendLabel}
        </a>
      </p>
    </div>
  );
}
