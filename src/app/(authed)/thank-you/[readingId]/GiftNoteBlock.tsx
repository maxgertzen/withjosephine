"use client";

import { type FormEvent, useState } from "react";

import { Button } from "@/components/Button";
import { InlineError } from "@/components/Form/InlineError";
import { Input } from "@/components/Form/Input";
import { GiftNoteCard } from "@/components/GiftNoteCard";
import { GiftNoteField } from "@/components/GiftNoteField";
import type { GiftContent } from "@/data/defaults";
import { GIFT_BUYER_NAME_MAX_CHARS } from "@/lib/booking/constants";
import { CLARITY_MASK_PROPS } from "@/lib/clarity";
import { applyTokens } from "@/lib/emails/applyTokens";
import { errorClasses } from "@/lib/formStyles";
import { type GiftNoteRequest, validateGiftSheet } from "@/lib/gift/giftInput";
import { jsonPost } from "@/lib/http/jsonPost";
import { GIFT_NOTE_API_ROUTE } from "@/lib/http/routes";
import { calloutClasses, goldLinkClasses, quietButtonClasses } from "@/lib/textStyles";

export type GiftNoteCopy = Pick<
  GiftContent,
  | "savedNoteLabelTemplate"
  | "editNoteLabel"
  | "noteFootnote"
  | "addNoteLabel"
  | "editNoteHeading"
  | "fromLabel"
  | "noteLabel"
  | "buyerNameRequired"
  | "noteCounterTemplate"
  | "saveNoteLabel"
  | "noteSavedNotice"
  | "noteLockedNotice"
  | "sheetSubmitFailed"
  | "sheetNetworkFailed"
  | "sheetCancelLabel"
>;

export type GiftNote = { buyerFirstName: string; text: string | null };

type GiftNoteBlockProps = {
  copy: GiftNoteCopy;
  note: GiftNote;
  noteEdit: { token: string } | null;
  onSaved?: (note: GiftNote) => void;
};

type NoteDraft = Omit<GiftNoteRequest, "token">;

type SaveOutcome = "saved" | "locked" | "failed" | "network_failed";
type NoteStatus = "idle" | "saving" | SaveOutcome;

async function postGiftNote(body: GiftNoteRequest): Promise<SaveOutcome> {
  const result = await jsonPost(GIFT_NOTE_API_ROUTE, body);
  if (result.ok) return "saved";
  if (result.topError === "network") return "network_failed";
  return result.status === 409 ? "locked" : "failed";
}

export function GiftNoteBlock({ copy, note, noteEdit, onSaved }: GiftNoteBlockProps) {
  const [savedNote, setSavedNote] = useState(note);
  const [draft, setDraft] = useState<NoteDraft | null>(null);
  const [showsNameError, setShowsNameError] = useState(false);
  const [status, setStatus] = useState<NoteStatus>("idle");

  function startEditing() {
    setDraft({ buyerFirstName: savedNote.buyerFirstName, note: savedNote.text ?? "" });
    setStatus("idle");
  }

  function cancelEditing() {
    setDraft(null);
    setShowsNameError(false);
    setStatus("idle");
  }

  async function saveNote(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!noteEdit || !draft) return;
    const validation = validateGiftSheet(draft);
    if ("fieldErrors" in validation) {
      const nameMissing = validation.fieldErrors.buyerFirstName === "required";
      setShowsNameError(nameMissing);
      setStatus(nameMissing ? "idle" : "failed");
      return;
    }
    setShowsNameError(false);
    setStatus("saving");
    const outcome = await postGiftNote({ token: noteEdit.token, ...draft });
    setStatus(outcome);
    if (outcome === "saved") {
      const saved = { buyerFirstName: validation.values.buyerFirstName, text: validation.values.note };
      setSavedNote(saved);
      setDraft(null);
      onSaved?.(saved);
    }
  }

  if (status === "locked") {
    return (
      <p role="status" className={`${calloutClasses} text-left`}>
        {copy.noteLockedNotice}
      </p>
    );
  }

  if (draft) {
    const submitError =
      status === "failed"
        ? copy.sheetSubmitFailed
        : status === "network_failed"
          ? copy.sheetNetworkFailed
          : null;
    return (
      <form
        {...CLARITY_MASK_PROPS}
        noValidate
        onSubmit={saveNote}
        aria-labelledby="gift-note-heading"
        className="flex flex-col gap-4 text-left"
      >
        <h2 id="gift-note-heading" className="font-display italic text-xl text-j-text-heading">
          {copy.editNoteHeading}
        </h2>
        <Input
          id="gift-note-from"
          name="buyerFirstName"
          label={copy.fromLabel}
          value={draft.buyerFirstName}
          onChange={(buyerFirstName) => setDraft({ ...draft, buyerFirstName })}
          error={showsNameError ? copy.buyerNameRequired : undefined}
          maxLength={GIFT_BUYER_NAME_MAX_CHARS}
          autoComplete="given-name"
          required
        />
        <GiftNoteField
          id="gift-note-text"
          label={copy.noteLabel}
          value={draft.note}
          onChange={(noteText) => setDraft({ ...draft, note: noteText })}
          copy={copy}
        />
        <Button
          type="submit"
          variant="outlined"
          disabled={!noteEdit || status === "saving"}
          className="w-full min-h-11 indent-[0.12em]"
        >
          {copy.saveNoteLabel}
        </Button>
        <InlineError message={submitError} className={errorClasses} />
        <button
          type="button"
          onClick={cancelEditing}
          className={quietButtonClasses}
        >
          {copy.sheetCancelLabel}
        </button>
      </form>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {status === "saved" ? (
        <p role="status" className={`${calloutClasses} text-left`}>
          {copy.noteSavedNotice}
        </p>
      ) : null}
      {savedNote.text ? (
        <GiftNoteCard
          label={applyTokens(copy.savedNoteLabelTemplate, { buyerName: savedNote.buyerFirstName })}
          note={savedNote.text}
          foot={
            <>
              <button type="button" onClick={startEditing} className={goldLinkClasses}>
                {copy.editNoteLabel}
              </button>
              {` · ${copy.noteFootnote}`}
            </>
          }
        />
      ) : (
        <button
          type="button"
          onClick={startEditing}
          className={`${goldLinkClasses} font-body text-sm self-center min-h-11`}
        >
          {copy.addNoteLabel}
        </button>
      )}
    </div>
  );
}
