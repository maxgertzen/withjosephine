"use client";

import { type ReactNode, useEffect, useState } from "react";

import { AnimatedCollapse } from "@/components/AnimatedCollapse";
import { isFoldedEntry } from "@/lib/intake/bookingEntry";
import { useBookingEntry } from "@/lib/intake/bookingEntryContext";
import { PRE_PAINT_FOLD_ATTRIBUTE } from "@/lib/intake/readingFoldPrePaint";
import { mergeClasses } from "@/lib/utils";

import { DisclosureButton } from "./DisclosureButton";

const ROW_WHEN_PRE_PAINT_FOLDED = "[body[data-reading-fold]_&]:flex";
const PANEL_WHEN_PRE_PAINT_FOLDED =
  "[body[data-reading-fold]_&]:grid-rows-[0fr]! [body[data-reading-fold]_&]:opacity-0! [body[data-reading-fold]_&]:invisible";

type ReadingFoldProps = {
  slug: string;
  label: string;
  children: ReactNode;
};

export function ReadingFold({ slug, label, children }: ReadingFoldProps) {
  const entry = useBookingEntry();
  const folded = isFoldedEntry(entry);
  const prePaintFoldable = !folded;
  const [open, setOpen] = useState(false);
  const [toggled, setToggled] = useState(false);
  const panelId = `${slug}-reading-block`;
  const rowId = `${slug}-reading-block-row`;

  useEffect(() => {
    if (entry !== null) document.body.removeAttribute(PRE_PAINT_FOLD_ATTRIBUTE);
  }, [entry]);

  return (
    <section className="mb-9">
      <DisclosureButton
        id={rowId}
        controls={panelId}
        open={open}
        onToggle={() => {
          setToggled(true);
          setOpen((previous) => !previous);
        }}
        className={mergeClasses(
          "rounded-[16px] border border-j-border-subtle bg-j-ivory shadow-j-soft",
          prePaintFoldable && ["hidden", ROW_WHEN_PRE_PAINT_FOLDED],
        )}
      >
        {label}
      </DisclosureButton>
      <AnimatedCollapse
        id={panelId}
        open={!folded || open}
        labelledBy={folded ? rowId : undefined}
        animated={toggled}
        className={prePaintFoldable ? PANEL_WHEN_PRE_PAINT_FOLDED : undefined}
      >
        <div className={folded ? "pt-5" : ""}>{children}</div>
      </AnimatedCollapse>
    </section>
  );
}
