"use client";

import HCaptcha from "@hcaptcha/react-hcaptcha";
import { type FormEvent, useRef, useState } from "react";

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

const WEB3FORMS_ENDPOINT = "https://api.web3forms.com/submit";

export function ContactForm({ content, className }: ContactFormProps) {
  const { sectionTag, heading, description, submitText } = content ?? CONTACT_DEFAULTS;

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  const [status, setStatus] = useState<FormStatus>("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const captchaRef = useRef<HCaptcha>(null);

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

    const accessKey = process.env.NEXT_PUBLIC_WEB3FORMS_KEY;
    if (!accessKey) {
      setErrorMessage("Contact form is not configured. Please try again later.");
      return;
    }

    setStatus("loading");

    try {
      const response = await fetch(WEB3FORMS_ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          access_key: accessKey,
          name: trimmedName,
          email: trimmedEmail,
          message: trimmedMessage,
          subject: `New message from ${trimmedName}`,
          botcheck: "",
          "h-captcha-response": captchaToken,
        }),
      });

      const data = await response.json();

      if (data.success) {
        setStatus("success");
        setName("");
        setEmail("");
        setMessage("");
        setCaptchaToken(null);
        captchaRef.current?.resetCaptcha();
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

          {process.env.NEXT_PUBLIC_HCAPTCHA_SITEKEY && (
            <div className="flex justify-center">
              <HCaptcha
                ref={captchaRef}
                sitekey={process.env.NEXT_PUBLIC_HCAPTCHA_SITEKEY}
                reCaptchaCompat={false}
                onVerify={(token) => setCaptchaToken(token)}
                onExpire={() => setCaptchaToken(null)}
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
                !captchaToken
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
