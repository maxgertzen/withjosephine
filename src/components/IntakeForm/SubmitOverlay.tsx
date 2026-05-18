"use client";

import { useEffect, useRef } from "react";

import { Loader } from "@/components/Loader";

type SubmitOverlayProps = {
  text?: string;
};

const DEFAULT_COPY = "One moment — taking you to checkout.";

export function SubmitOverlay({ text }: SubmitOverlayProps) {
  const messageRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    messageRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
  }, []);
  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed inset-0 z-50 flex flex-col items-center bg-j-ivory/95 backdrop-blur-[1px] j-fade-in pt-[22vh] px-6"
    >
      <div ref={messageRef} className="flex flex-col items-center max-w-prose text-center">
        <Loader size="lg" decorative className="mb-3" />
        <p className="font-display italic text-lg text-j-text-heading">
          {text ?? DEFAULT_COPY}
        </p>
      </div>
    </div>
  );
}
