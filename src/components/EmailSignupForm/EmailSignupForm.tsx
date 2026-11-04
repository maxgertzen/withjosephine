"use client";

import Link from "next/link";
import { type FormEvent, useId, useState } from "react";

import { Button } from "@/components/Button";
import { HoneypotField } from "@/components/HoneypotField";
import { InvisibleTurnstile } from "@/components/InvisibleTurnstile";
import type { SignupFormWords } from "@/data/defaults";
import { isValidAuthEmail } from "@/lib/auth/emailValidation";
import { HONEYPOT_FIELD } from "@/lib/booking/constants";
import { ROUTES } from "@/lib/constants";
import { errorClasses } from "@/lib/formStyles";
import { jsonPost } from "@/lib/http/jsonPost";
import { SIGNUP_API_ROUTE } from "@/lib/http/routes";
import { useTurnstileChallenge } from "@/lib/intake/useTurnstileChallenge";
import { NEWSLETTER_CONSENT_TEXT, NEWSLETTER_PRIVACY_LINK_TEXT } from "@/lib/signup/newsletterConsent";
import type { SignupRequest } from "@/lib/signup/signupRequest";
import { mergeClasses } from "@/lib/utils";

type FormStatus = "idle" | "sending" | "sent";

type Problem = keyof Pick<SignupFormWords, "invalidEmail" | "failed">;

export type EmailSignupFormProps = {
  words: SignupFormWords;
  newsletterBox: "optional" | "required" | "none";
  buttonKey?: string;
  className?: string;
};

const INPUT_CLASSES =
  "min-h-12 w-full rounded-full border border-j-border-subtle bg-white/70 px-5 font-body text-base text-j-text placeholder:text-j-text-muted focus:border-j-text-gold focus:outline-none aria-invalid:border-red-700";

export function EmailSignupForm({ words, newsletterBox, buttonKey, className }: EmailSignupFormProps) {
  const id = useId();
  const turnstile = useTurnstileChallenge();
  const [email, setEmail] = useState("");
  const [newsletterTicked, setNewsletterTicked] = useState(false);
  const [honeypot, setHoneypot] = useState("");
  const [status, setStatus] = useState<FormStatus>("idle");
  const [problem, setProblem] = useState<Problem | null>(null);

  const emailId = `${id}-email`;
  const problemId = `${id}-problem`;

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setProblem(null);
    if (!isValidAuthEmail(email)) {
      setProblem("invalidEmail");
      return;
    }
    setStatus("sending");
    const turnstileToken = turnstile.turnstileRequired ? await turnstile.requestFreshToken() : "";
    const request: SignupRequest = {
      email: email.trim(),
      wantsNewsletter: newsletterTicked,
      buttonKey,
      turnstileToken: turnstileToken ?? "",
      [HONEYPOT_FIELD]: honeypot,
    };
    const result = await jsonPost(SIGNUP_API_ROUTE, request);
    setStatus(result.ok ? "sent" : "idle");
    if (!result.ok) setProblem("failed");
  }

  if (status === "sent") {
    return (
      <p role="status" className={mergeClasses("font-body text-[0.95rem] text-j-text-heading", className)}>
        {words.sent}
      </p>
    );
  }

  const sending = status === "sending";

  return (
    <form
      onSubmit={handleSubmit}
      noValidate
      className={mergeClasses("flex w-full flex-col gap-3 text-left", className)}
    >
      <HoneypotField value={honeypot} onChange={setHoneypot} />
      <div className="flex w-full flex-col gap-2 sm:flex-row">
        <label htmlFor={emailId} className="sr-only">
          {words.emailLabel}
        </label>
        <input
          id={emailId}
          type="email"
          name="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder={words.emailLabel}
          autoComplete="email"
          inputMode="email"
          autoCapitalize="none"
          disabled={sending}
          aria-invalid={problem === "invalidEmail"}
          aria-describedby={problem ? problemId : undefined}
          className={INPUT_CLASSES}
        />
        <Button
          type="submit"
          className="min-h-12 shrink-0"
          disabled={sending || (newsletterBox === "required" && !newsletterTicked)}
        >
          {sending ? words.sending : words.submit}
        </Button>
      </div>
      {newsletterBox === "none" ? null : (
      <label className="flex items-start gap-3 font-body text-[0.82rem] leading-snug text-j-text-muted">
        <input
          type="checkbox"
          name="newsletter"
          checked={newsletterTicked}
          onChange={(event) => setNewsletterTicked(event.target.checked)}
          disabled={sending}
          className="mt-0.5 h-4 w-4 shrink-0 accent-j-bg-interactive"
        />
        <span>
          {NEWSLETTER_CONSENT_TEXT}{" "}
          <Link href={ROUTES.privacy} className="underline underline-offset-2 hover:text-j-text-gold">
            {NEWSLETTER_PRIVACY_LINK_TEXT}
          </Link>
        </span>
      </label>
      )}
      {problem ? (
        <p id={problemId} role="alert" className={errorClasses}>
          {words[problem]}
        </p>
      ) : null}
      <InvisibleTurnstile challenge={turnstile} />
    </form>
  );
}
