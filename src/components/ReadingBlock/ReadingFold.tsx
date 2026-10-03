"use client";

import { type ReactNode, useState } from "react";

import { AnimatedCollapse } from "@/components/AnimatedCollapse";
import { isFoldedEntry } from "@/lib/intake/bookingEntry";
import { useBookingEntry } from "@/lib/intake/bookingEntryContext";

import { DisclosureButton } from "./DisclosureButton";

type ReadingFoldProps = {
  slug: string;
  label: string;
  children: ReactNode;
};

export function ReadingFold({ slug, label, children }: ReadingFoldProps) {
  const folded = isFoldedEntry(useBookingEntry());
  const [open, setOpen] = useState(false);
  const [toggled, setToggled] = useState(false);
  const panelId = `${slug}-reading-block`;
  const rowId = `${slug}-reading-block-row`;

  return (
    <section className="mb-9">
      {folded ? (
        <DisclosureButton
          id={rowId}
          controls={panelId}
          open={open}
          onToggle={() => {
            setToggled(true);
            setOpen((previous) => !previous);
          }}
          className="rounded-[16px] border border-j-border-subtle bg-j-ivory shadow-j-soft"
        >
          {label}
        </DisclosureButton>
      ) : null}
      <AnimatedCollapse
        id={panelId}
        open={!folded || open}
        labelledBy={folded ? rowId : undefined}
        animated={toggled}
      >
        <div className={folded ? "pt-5" : ""}>{children}</div>
      </AnimatedCollapse>
    </section>
  );
}
