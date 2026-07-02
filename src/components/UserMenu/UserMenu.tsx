"use client";

import * as Popover from "@radix-ui/react-popover";

import { SignOutForm } from "@/components/SignOutForm";

function BookGlyph() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.4"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-[18px] w-[18px]"
      aria-hidden="true"
    >
      <path d="M12 6.5C10.4 5.4 8.3 5 6 5c-1 0-1.9.1-2.7.3a.6.6 0 0 0-.3.5v11c0 .3.3.6.7.5C4.4 17.1 5.2 17 6 17c2.3 0 4.4.4 6 1.5" />
      <path d="M12 6.5C13.6 5.4 15.7 5 18 5c1 0 1.9.1 2.7.3a.6.6 0 0 1 .3.5v11c0 .3-.3.6-.7.5-.7-.2-1.5-.3-2.3-.3-2.3 0-4.4.4-6 1.5" />
      <path d="M12 6.5v12" />
    </svg>
  );
}

const rowClasses =
  "block w-full text-left px-4 py-2.5 font-body text-sm transition-colors hover:bg-j-warm";

export function UserMenu({ email }: { email: string }) {
  return (
    <Popover.Root>
      <Popover.Trigger asChild>
        <button
          type="button"
          aria-label="Your library and account"
          className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-j-deep text-j-cream ring-1 ring-j-border-gold transition-shadow hover:ring-j-gold focus:outline-none focus-visible:ring-2 focus-visible:ring-j-gold"
        >
          <BookGlyph />
        </button>
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content
          align="end"
          sideOffset={8}
          className="z-50 min-w-56 max-w-[80vw] overflow-hidden rounded-2xl border border-j-border-subtle bg-j-cream p-0 shadow-j-card"
        >
          <p className="truncate px-4 pt-3 pb-2 font-body text-xs text-j-text-muted" title={email}>
            {email}
          </p>
          <div className="border-t border-j-border-subtle" />
          <SignOutForm buttonClassName={`${rowClasses} text-j-text-muted hover:text-j-text-heading`} />
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}
