"use client";

import { Turnstile } from "@marsidev/react-turnstile";
import { type FormEvent, useState } from "react";

import { Button } from "@/components/Button";
import { SectionHeading } from "@/components/SectionHeading";
import { CONTACT_DEFAULTS, type ContactFormContent } from "@/data/defaults";
import { errorClasses, inputClasses, isValidEmail, labelClasses } from "@/lib/formStyles";
import { mergeClasses } from "@/lib/utils";

interface ContactFormProps {
  content?: ContactFormContent;
  className?: string;
}

type FormStatus = "idle" | "loading" | "success" | "error";

const CONTACT_API_ROUTE = "/api/contact";

export function ContactForm({ content, className }: ContactFormProps) {
  const { sectionTag, heading, description, submitText } = content ?? CONTACT_DEFAULTS;

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);
  const [status, setStatus] = useState<FormStatus>("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const turnstileSiteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorMessage(null);

    const trimmedName = name.trim();
    const trimmedEmail = email.trim();
    const trimmedMessage = message.trim();

    if (!trimmedName) {
      setErrorMessage("Please enter your name.");
      return;
    }
    if (!trimmedEmail) {
      setErrorMessage("Please enter your email address.");
      return;
    }
    if (!isValidEmail(trimmedEmail)) {
      setErrorMessage("Please enter a valid email address.");
      return;
    }
    if (!trimmedMessage) {
      setErrorMessage("Please enter a message.");
      return;
    }
    if (!turnstileToken) {
      setErrorMessage("Please complete the verification check.");
      return;
    }

    setStatus("loading");

    try {
      const response = await fetch(CONTACT_API_ROUTE, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: trimmedName,
          email: trimmedEmail,
          message: trimmedMessage,
          turnstileToken,
          botcheck: "",
        }),
      });

      const data = await response.json().catch(() => null);

      if (response.ok && data?.success) {
        setStatus("success");
        setName("");
        setEmail("");
        setMessage("");
        setTurnstileToken(null);
      } else {
        setStatus("error");
        setErrorMessage("Something went wrong. Please try again.");
      }
    } catch {
      setStatus("error");
      setErrorMessage("Could not send your message. Please try again later.");
    }
  }

  const isLoading = status === "loading";

  if (status === "success") {
    return (
      <section id="contact" className={mergeClasses("py-24 px-6", className)}>
        <div className="max-w-lg mx-auto text-center">
          <SectionHeading tag={sectionTag} heading="message sent" className="mb-6" />
          <p className="font-body text-base text-j-text-muted">
            Thank you for reaching out. I&rsquo;ll get back to you as soon as I can.
          </p>
          <div className="mt-8">
            <Button type="button" variant="ghost" onClick={() => setStatus("idle")}>
              Send another message
            </Button>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section id="contact" className={mergeClasses("py-24 px-6", className)}>
      <div className="max-w-lg mx-auto">
        <SectionHeading tag={sectionTag} heading={heading} className="mb-6" />

        <p className="font-body text-base text-j-text-muted text-center mb-12">{description}</p>

        <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-6">
          <input
            type="checkbox"
            name="botcheck"
            className="hidden"
            aria-hidden="true"
            tabIndex={-1}
            autoComplete="off"
          />
          <div>
            <label htmlFor="contact-name" className={labelClasses}>
              Your Name
            </label>
            <input
              id="contact-name"
              type="text"
              name="name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              className={inputClasses}
              disabled={isLoading}
            />
          </div>

          <div>
            <label htmlFor="contact-email" className={labelClasses}>
              Your Email
            </label>
            <input
              id="contact-email"
              type="email"
              name="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className={inputClasses}
              disabled={isLoading}
            />
          </div>

          <div>
            <label htmlFor="contact-message" className={labelClasses}>
              Your Message
            </label>
            <textarea
              id="contact-message"
              name="message"
              rows={5}
              value={message}
              onChange={(event) => setMessage(event.target.value)}
              className={inputClasses}
              disabled={isLoading}
            />
          </div>

          {turnstileSiteKey && (
            <div className="flex justify-center">
              <Turnstile
                siteKey={turnstileSiteKey}
                onSuccess={setTurnstileToken}
                onExpire={() => setTurnstileToken(null)}
                onError={() => setTurnstileToken(null)}
              />
            </div>
          )}

          {errorMessage && (
            <p role="alert" className={errorClasses}>
              {errorMessage}
            </p>
          )}

          <div className="text-center">
            <Button
              type="submit"
              disabled={
                isLoading ||
                !name.trim() ||
                !isValidEmail(email.trim()) ||
                !message.trim() ||
                !turnstileToken
              }
            >
              {isLoading ? "Sending\u2026" : submitText}
            </Button>
          </div>
        </form>
      </div>
    </section>
  );
}
