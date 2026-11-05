"use client";

import Link from "next/link";
import { type FormEvent, useId, useState } from "react";

import { Button } from "@/components/Button";
import { HoneypotField } from "@/components/HoneypotField";
import { InvisibleTurnstile } from "@/components/InvisibleTurnstile";
import type { NewsletterConsentWords, SignupFormWords } from "@/data/defaults";
import { isValidAuthEmail } from "@/lib/auth/emailValidation";
import { HONEYPOT_FIELD } from "@/lib/booking/constants";
import { ROUTES } from "@/lib/constants";
import { errorClasses } from "@/lib/formStyles";
import { jsonPost } from "@/lib/http/jsonPost";
import { SIGNUP_API_ROUTE } from "@/lib/http/routes";
import { useTurnstileChallenge } from "@/lib/intake/useTurnstileChallenge";
import type { SignupRequest } from "@/lib/signup/signupRequest";
import { mergeClasses } from "@/lib/utils";

type FormStatus = "idle" | "sending" | "sent";

type Problem = keyof Pick<SignupFormWords, "invalidEmail" | "failed">;

export type EmailSignupFormProps = {
  words: SignupFormWords;
  newsletter: { box: "optional" | "required"; consent: NewsletterConsentWords } | null;
  look?: keyof typeof LOOK;
  buttonKey?: string;
  className?: string;
};

const ON_LIGHT_TEXT = {
  checkbox: "accent-j-bg-interactive",
  consent: "text-j-text-muted",
  link: "hover:text-j-text-gold",
  sent: "text-j-text-heading",
  error: errorClasses,
};

const UNDERLINE_ROW = "flex w-full items-center gap-3 border-b";
const UNDERLINE_INPUT = "min-h-12 min-w-0 flex-1 border-0 bg-transparent px-0.5 font-body text-base focus:outline-none";
const UNDERLINE_BUTTON =
  "flex max-w-[50%] shrink-0 items-center gap-2 px-0 py-2 text-right text-[0.78rem] font-medium tracking-[0.16em] disabled:opacity-40";

const LOOK = {
  pill: {
    row: "flex w-full flex-col gap-2",
    input:
      "min-h-12 w-full rounded-full border border-j-border-subtle bg-white/70 px-5 font-body text-base text-j-text placeholder:text-j-text-muted focus:border-j-text-gold focus:outline-none aria-invalid:border-red-700",
    buttonVariant: "primary",
    button: "min-h-12 w-full break-words",
    ...ON_LIGHT_TEXT,
  },
  underline: {
    row: `${UNDERLINE_ROW} border-j-deep focus-within:border-j-text-gold has-[input[aria-invalid=true]]:border-red-700!`,
    input: `${UNDERLINE_INPUT} text-j-text placeholder:text-j-text-muted`,
    buttonVariant: "ghost",
    button: `${UNDERLINE_BUTTON} text-j-deep disabled:hover:text-j-deep`,
    ...ON_LIGHT_TEXT,
  },
  "underline-on-dark": {
    row: `${UNDERLINE_ROW} border-j-text-on-dark/55 focus-within:border-j-text-gold-lg has-[input[aria-invalid=true]]:border-red-300!`,
    input: `${UNDERLINE_INPUT} text-j-text-on-dark placeholder:text-j-text-on-dark/55`,
    buttonVariant: "ghost",
    button: `${UNDERLINE_BUTTON} text-j-text-gold-lg hover:text-j-text-on-dark focus-visible:outline-j-text-on-dark disabled:hover:text-j-text-gold-lg`,
    checkbox: "accent-j-text-gold-lg",
    consent: "text-j-text-on-dark/75",
    link: "hover:text-j-text-gold-lg",
    sent: "text-j-text-on-dark",
    error: "font-body text-sm text-red-300",
  },
} as const;

export function EmailSignupForm({ words, newsletter, look = "pill", buttonKey, className }: EmailSignupFormProps) {
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
      consentText: newsletter && newsletterTicked ? newsletter.consent.consentText : null,
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
      <p role="status" className={mergeClasses("font-body text-[0.95rem]", LOOK[look].sent, className)}>
        {words.sent}
      </p>
    );
  }

  const sending = status === "sending";
  const submitOff = sending || (newsletter?.box === "required" && !newsletterTicked);

  return (
    <form
      onSubmit={handleSubmit}
      noValidate
      className={mergeClasses("flex w-full flex-col gap-3 text-left", className)}
    >
      <HoneypotField value={honeypot} onChange={setHoneypot} />
      <div className={LOOK[look].row}>
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
          className={LOOK[look].input}
        />
        <Button type="submit" variant={LOOK[look].buttonVariant} className={LOOK[look].button} disabled={submitOff}>
          {sending ? words.sending : words.submit}
          {LOOK[look].buttonVariant === "ghost" ? <span aria-hidden="true">→</span> : null}
        </Button>
      </div>
      {newsletter === null ? null : (
      <label className={mergeClasses("flex items-start gap-3 font-body text-[0.82rem] leading-snug", LOOK[look].consent)}>
        <input
          type="checkbox"
          name="newsletter"
          checked={newsletterTicked}
          onChange={(event) => setNewsletterTicked(event.target.checked)}
          disabled={sending}
          className={mergeClasses("mt-0.5 h-4 w-4 shrink-0", LOOK[look].checkbox)}
        />
        <span>
          {newsletter.consent.consentText}{" "}
          <Link href={ROUTES.privacy} className={mergeClasses("underline underline-offset-2", LOOK[look].link)}>
            {newsletter.consent.privacyLinkText}
          </Link>
        </span>
      </label>
      )}
      {problem ? (
        <p id={problemId} role="alert" className={LOOK[look].error}>
          {words[problem]}
        </p>
      ) : null}
      <InvisibleTurnstile challenge={turnstile} />
    </form>
  );
}
