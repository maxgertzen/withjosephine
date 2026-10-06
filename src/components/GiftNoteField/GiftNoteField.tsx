import { CharacterCounter } from "@/components/Form/CharacterCounter";
import { Textarea } from "@/components/Form/Textarea";
import type { GiftContent } from "@/data/defaults";
import {
  GIFT_NOTE_COUNTER_SHOW_FROM,
  GIFT_NOTE_COUNTER_WARN_FROM,
  GIFT_NOTE_MAX_CHARS,
} from "@/lib/booking/constants";

type GiftNoteFieldProps = {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  helpText?: string;
  rows?: number;
  copy: Pick<GiftContent, "noteCounterTemplate">;
};

export function GiftNoteField({
  id,
  label,
  value,
  onChange,
  helpText,
  rows,
  copy,
}: GiftNoteFieldProps) {
  return (
    <div>
      <Textarea
        id={id}
        name="note"
        label={label}
        value={value}
        onChange={onChange}
        rows={rows}
        helpText={helpText}
        maxLength={GIFT_NOTE_MAX_CHARS}
      />
      <CharacterCounter
        length={value.length}
        max={GIFT_NOTE_MAX_CHARS}
        showFrom={GIFT_NOTE_COUNTER_SHOW_FROM}
        warnFrom={GIFT_NOTE_COUNTER_WARN_FROM}
        template={copy.noteCounterTemplate}
      />
    </div>
  );
}
