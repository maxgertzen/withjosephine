"use client";

import { GiftNoteCard } from "@/components/GiftNoteCard";
import { calloutClasses } from "@/lib/textStyles";

import { useGiftMode } from "./GiftModeContext";

export type GiftModeNoteProps = {
  label: string;
  note: string | null;
  foot: string;
  draftRestoredNotice: string;
};

export function GiftModeNote({ label, note, foot, draftRestoredNotice }: GiftModeNoteProps) {
  const { active, draftRestored } = useGiftMode();
  if (!active) return null;
  return (
    <div className="mb-9 flex flex-col gap-4">
      <GiftNoteCard label={label} note={note} foot={foot} />
      {draftRestored ? <p className={`m-0 ${calloutClasses}`}>{draftRestoredNotice}</p> : null}
    </div>
  );
}
