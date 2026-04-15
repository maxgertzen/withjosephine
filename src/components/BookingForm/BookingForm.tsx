"use client";

import { useState, type FormEvent } from "react";
import { Button } from "@/components/Button";
import { GoldDivider } from "@/components/GoldDivider";
import { inputClasses, labelClasses, errorClasses, isValidEmail } from "@/lib/formStyles";

type BookingFormReading = {
  subtitle: string;
  price: string;
  stripePaymentLink: string;
};

type BookingFormContent = {
  emailLabel: string;
  emailDisclaimer: string;
  paymentButtonText: string;
  securityNote: string;
};

interface BookingFormProps {
  reading: BookingFormReading;
  content: BookingFormContent;
}

export function BookingForm({ reading, content }: BookingFormProps) {
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isRedirecting, setIsRedirecting] = useState(false);

  const paymentUnavailable = !reading.stripePaymentLink;

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    const trimmedEmail = email.trim();

    if (!trimmedEmail) {
      setError("Please enter your email address.");
      return;
    }

    if (!isValidEmail(trimmedEmail)) {
      setError("Please enter a valid email address.");
      return;
    }

    if (paymentUnavailable) {
      setError("Payment is not available at the moment. Please try again later.");
      return;
    }

    setIsRedirecting(true);

    const abort = (msg: string) => { setError(msg); setIsRedirecting(false); };

    try {
      const paymentUrl = new URL(reading.stripePaymentLink);
      if (paymentUrl.protocol !== "https:" || !paymentUrl.hostname.endsWith(".stripe.com")) {
        abort("Invalid payment link. Please contact support.");
        return;
      }
      paymentUrl.searchParams.set("prefilled_email", trimmedEmail);
      window.location.href = paymentUrl.toString();
    } catch {
      abort("Invalid payment link. Please contact support.");
    }
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-5">
      <div>
        <label htmlFor="booking-email" className={labelClasses}>
          {content.emailLabel}
        </label>
        <input
          id="booking-email"
          type="email"
          name="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          className={inputClasses}
          disabled={isRedirecting}
        />
        <p className="font-body text-xs text-j-muted mt-2">
          {content.emailDisclaimer}
        </p>
      </div>

      {paymentUnavailable && (
        <p role="alert" className={errorClasses}>
          Payment is not available at the moment. Please try again later.
        </p>
      )}

      {error && (
        <p role="alert" className={errorClasses}>
          {error}
        </p>
      )}

      <GoldDivider className="my-2" />

      <div className="flex items-center justify-between">
        <span className="font-body text-sm text-j-text">{reading.subtitle}</span>
        <span className="font-display text-xl italic text-j-accent">{reading.price}</span>
      </div>

      <Button type="submit" size="lg" className="w-full text-center" disabled={isRedirecting || paymentUnavailable || !isValidEmail(email.trim())}>
        {isRedirecting ? "Redirecting to payment\u2026" : content.paymentButtonText}
      </Button>

      <p className="font-body text-xs text-j-muted text-center">
        {content.securityNote}
      </p>
    </form>
  );
}
