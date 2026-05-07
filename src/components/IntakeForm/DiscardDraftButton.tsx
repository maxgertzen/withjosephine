"use client";

import { useEffect, useRef, useState } from "react";

type DiscardDraftButtonProps = {
  onConfirm: () => void;
};

type Mode = "idle" | "confirming";

export function DiscardDraftButton({ onConfirm }: DiscardDraftButtonProps) {
  const [mode, setMode] = useState<Mode>("idle");
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const cancelRef = useRef<HTMLButtonElement | null>(null);
  // Set when the user dismisses confirming-mode without confirming, so the
  // next render of the idle trigger restores keyboard focus to it. Cleared
  // after the focus call lands.
  const returnFocusToTriggerRef = useRef(false);

  useEffect(() => {
    if (mode === "confirming") {
      cancelRef.current?.focus();
      return;
    }
    if (returnFocusToTriggerRef.current) {
      returnFocusToTriggerRef.current = false;
      triggerRef.current?.focus();
    }
  }, [mode]);

  function handleCancel() {
    returnFocusToTriggerRef.current = true;
    setMode("idle");
  }

  function handleConfirm() {
    setMode("idle");
    onConfirm();
  }

  if (mode === "idle") {
    return (
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setMode("confirming")}
        data-testid="discard-draft-button"
        className="font-display italic text-sm text-j-text-muted hover:text-j-text underline-offset-2 hover:underline transition-colors cursor-pointer"
      >
        Clear form
      </button>
    );
  }

  return (
    <div
      role="group"
      aria-label="Confirm clearing the form"
      data-testid="discard-draft-confirm"
      onKeyDown={(event) => {
        if (event.key === "Escape") {
          event.preventDefault();
          handleCancel();
        }
      }}
      className="inline-flex flex-wrap items-center gap-x-3 gap-y-1 motion-safe:transition-opacity duration-200"
    >
      <span className="font-display italic text-sm text-j-rose">
        Clear what you&apos;ve written?
      </span>
      <span aria-hidden="true" className="text-j-blush text-sm">
        ·
      </span>
      <button
        ref={cancelRef}
        type="button"
        onClick={handleCancel}
        data-testid="discard-draft-cancel"
        className="font-body text-sm text-j-text-muted hover:text-j-text-heading underline-offset-2 hover:underline transition-colors cursor-pointer py-2 -my-2"
      >
        Keep it
      </button>
      <button
        type="button"
        onClick={handleConfirm}
        data-testid="discard-draft-confirm-yes"
        className="font-body text-sm font-medium text-j-rose hover:text-j-text-heading underline underline-offset-2 decoration-j-rose/40 hover:decoration-j-text-heading transition-colors cursor-pointer py-2 -my-2"
      >
        Yes, clear it
      </button>
    </div>
  );
}
