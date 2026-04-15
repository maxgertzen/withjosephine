"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";
import { Button } from "@/components/Button";
import { GoldDivider } from "@/components/GoldDivider";
import { ROUTES } from "@/lib/constants";
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
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [coolingOffWaived, setCoolingOffWaived] = useState(false);
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

    if (!termsAccepted) {
      setError("Please accept the Terms of Service and Refund Policy.");
      return;
    }

    if (!coolingOffWaived) {
      setError(
        "Please acknowledge that Josephine may begin preparing your reading immediately.",
      );
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

      <div className="flex flex-col gap-3">
        <label
          htmlFor="booking-terms"
          className="flex items-start gap-3 font-body text-xs text-j-text leading-[1.6] cursor-pointer"
        >
          <input
            id="booking-terms"
            type="checkbox"
            checked={termsAccepted}
            onChange={(event) => setTermsAccepted(event.target.checked)}
            disabled={isRedirecting}
            className="mt-[3px] h-4 w-4 shrink-0 accent-j-accent cursor-pointer"
          />
          <span>
            I have read and agree to the{" "}
            <Link
              href={ROUTES.terms}
              target="_blank"
              rel="noopener noreferrer"
              className="text-j-accent hover:underline"
            >
              Terms of Service
            </Link>{" "}
            and{" "}
            <Link
              href={ROUTES.refundPolicy}
              target="_blank"
              rel="noopener noreferrer"
              className="text-j-accent hover:underline"
            >
              Refund Policy
            </Link>
            .
          </span>
        </label>

        <label
          htmlFor="booking-cooling-off"
          className="flex items-start gap-3 font-body text-xs text-j-text leading-[1.6] cursor-pointer"
        >
          <input
            id="booking-cooling-off"
            type="checkbox"
            checked={coolingOffWaived}
            onChange={(event) => setCoolingOffWaived(event.target.checked)}
            disabled={isRedirecting}
            className="mt-[3px] h-4 w-4 shrink-0 accent-j-accent cursor-pointer"
          />
          <span>
            I agree that Josephine may begin preparing my reading
            immediately, and I understand I will lose my right to cancel
            for a refund once I submit the intake form.
          </span>
        </label>
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

      <Button
        type="submit"
        size="lg"
        className="w-full text-center"
        disabled={
          isRedirecting ||
          paymentUnavailable ||
          !isValidEmail(email.trim()) ||
          !termsAccepted ||
          !coolingOffWaived
        }
      >
        {isRedirecting ? "Redirecting to payment\u2026" : content.paymentButtonText}
      </Button>

      <p className="font-body text-xs text-j-muted text-center">
        {content.securityNote}
      </p>
    </form>
  );
}
