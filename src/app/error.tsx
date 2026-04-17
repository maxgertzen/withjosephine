"use client";

import { useEffect } from "react";

import { Button } from "@/components/Button";

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Application error:", error);
  }, [error]);

  return (
    <div className="relative min-h-screen bg-j-cream flex flex-col items-center justify-center px-6 text-center">
      <div className="flex flex-col items-center max-w-md">
        <span className="text-[0.68rem] tracking-[0.22em] uppercase text-j-accent font-body block mb-4">
          ✦ Something Went Wrong
        </span>

        <h1 className="font-display text-[clamp(2rem,5vw,3.2rem)] font-light italic text-j-text-heading leading-tight">
          an unexpected error occurred
        </h1>

        <p className="font-body text-base text-j-text-muted mt-4">
          We&apos;re sorry for the inconvenience. Please try again, or return to the homepage.
        </p>

        <div className="mt-8 flex gap-4">
          <Button onClick={reset}>Try Again</Button>
          <Button href="/" variant="ghost">
            Return Home
          </Button>
        </div>
      </div>
    </div>
  );
}
