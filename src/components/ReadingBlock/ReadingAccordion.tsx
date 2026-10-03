"use client";

import { type ReactNode, useState } from "react";

import { AnimatedCollapse } from "@/components/AnimatedCollapse";

import { DisclosureButton } from "./DisclosureButton";

type ReadingAccordionProps = {
  id: string;
  title: string;
  children: ReactNode;
};

export function ReadingAccordion({ id, title, children }: ReadingAccordionProps) {
  const [open, setOpen] = useState(false);
  const buttonId = `${id}-button`;
  const panelId = `${id}-panel`;

  return (
    <div className="bg-j-ivory border border-j-border-subtle rounded-[16px] overflow-hidden shadow-j-soft">
      <h2 className="m-0 font-normal">
        <DisclosureButton
          id={buttonId}
          controls={panelId}
          open={open}
          onToggle={() => setOpen((previous) => !previous)}
        >
          {title}
        </DisclosureButton>
      </h2>
      <AnimatedCollapse id={panelId} open={open} labelledBy={buttonId}>
        <div className="px-6 pb-5">{children}</div>
      </AnimatedCollapse>
    </div>
  );
}
