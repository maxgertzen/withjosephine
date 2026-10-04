import type { ReactNode } from "react";

import { CLARITY_MASK_PROPS } from "@/lib/clarity";
import { smallCapsClasses } from "@/lib/textStyles";

type GiftNoteCardProps = {
  label: string;
  note: string | null;
  foot: ReactNode;
};

export function GiftNoteCard({ label, note, foot }: GiftNoteCardProps) {
  return (
    <div className="flex flex-col gap-2 rounded-[16px] border border-j-border-subtle bg-j-warm p-5 text-left">
      <p className={`${smallCapsClasses} m-0 text-j-text-muted-warm`}>{label}</p>
      {note ? (
        <p
          className="m-0 whitespace-pre-line font-display text-[1.3rem] italic leading-[1.45] text-j-deep"
          {...CLARITY_MASK_PROPS}
        >
          {note}
        </p>
      ) : null}
      <div className="font-body text-sm text-j-text-muted-warm">{foot}</div>
    </div>
  );
}
