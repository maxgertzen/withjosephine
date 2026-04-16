"use client";

import Link from "next/link";
import { useState, type FormEvent, type ReactNode } from "react";
import { Button } from "@/components/Button";
import { GoldDivider } from "@/components/GoldDivider";
import { ROUTES } from "@/lib/constants";
import { inputClasses, labelClasses, errorClasses, isValidEmail } from "@/lib/formStyles";

function CheckboxField({
  id,
  checked,
  onChange,
  disabled,
  children,
}: {
  id: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled: boolean;
  children: ReactNode;
}) {
  return (
    <label
      htmlFor={id}
      className="flex items-start gap-3 font-body text-xs text-j-text leading-[1.6] cursor-pointer"
    >
      <input
        id={id}
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        disabled={disabled}
        className="mt-[3px] h-4 w-4 shrink-0 accent-j-accent cursor-pointer"
      />
      <span>{children}</span>
    </label>
  );
}

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
  entertainmentAcknowledgment: string;
  coolingOffAcknowledgment: string;
};

interface BookingFormProps {
  reading: BookingFormReading;
  content: BookingFormContent;
}

export function BookingForm({ reading, content }: BookingFormProps) {
  const [email, setEmail] = useState("");
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [entertainmentAcknowledged, setEntertainmentAcknowledged] =
    useState(false);
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

    if (!entertainmentAcknowledged) {
      setError(
        "Please acknowledge that this reading is for entertainment purposes only.",
      );
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
        <CheckboxField
          id="booking-terms"
          checked={termsAccepted}
          onChange={setTermsAccepted}
          disabled={isRedirecting}
        >
          I have read and agree to the{" "}
          <Link
            href={ROUTES.terms}
            target="_blank"
            rel="noopener noreferrer"
            className="text-j-accent hover:underline"
          >
            Terms of Service
            <span className="sr-only"> (opens in a new tab)</span>
          </Link>{" "}
          and{" "}
          <Link
            href={ROUTES.refundPolicy}
            target="_blank"
            rel="noopener noreferrer"
            className="text-j-accent hover:underline"
          >
            Refund Policy
            <span className="sr-only"> (opens in a new tab)</span>
          </Link>
          .
        </CheckboxField>

        <CheckboxField
          id="booking-entertainment"
          checked={entertainmentAcknowledged}
          onChange={setEntertainmentAcknowledged}
          disabled={isRedirecting}
        >
          {content.entertainmentAcknowledgment}
        </CheckboxField>

        <CheckboxField
          id="booking-cooling-off"
          checked={coolingOffWaived}
          onChange={setCoolingOffWaived}
          disabled={isRedirecting}
        >
          {content.coolingOffAcknowledgment}
        </CheckboxField>
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
          !entertainmentAcknowledged ||
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
