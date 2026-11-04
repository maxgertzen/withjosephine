"use client";

import dynamic from "next/dynamic";
import { type ReactNode, useId, useState } from "react";

import type { LinksPageEmailFormWords } from "@/data/defaults";

const EmailSignupForm = dynamic(() => import("@/components/EmailSignupForm").then((module) => module.EmailSignupForm));

type EmailFirstButtonProps = {
  buttonKey: string;
  className: string;
  words: LinksPageEmailFormWords;
  offersNewsletter: boolean;
  trackingAttributes: Record<string, string>;
  children: ReactNode;
};

export function EmailFirstButton({ buttonKey, className, words, offersNewsletter, trackingAttributes, children }: EmailFirstButtonProps) {
  const formId = useId();
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        aria-expanded={open}
        aria-controls={formId}
        onClick={() => setOpen((wasOpen) => !wasOpen)}
        className={className}
        {...trackingAttributes}
      >
        {children}
      </button>
      {open ? (
        <div id={formId} className="mt-3 rounded-2xl bg-white/50 px-4 py-4 text-left">
          <p className="m-0 mb-3 font-body text-[0.95rem] text-j-text-heading">{words.prompt}</p>
          <EmailSignupForm words={words} newsletterBox={offersNewsletter ? "optional" : "none"} buttonKey={buttonKey} />
        </div>
      ) : null}
    </>
  );
}
