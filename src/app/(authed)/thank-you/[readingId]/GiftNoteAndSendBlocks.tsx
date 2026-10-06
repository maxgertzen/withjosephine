"use client";

import { useState } from "react";

import type { GiftSendStatus } from "@/lib/gift/giftSendContract";

import { type GiftNote, GiftNoteBlock, type GiftNoteCopy } from "./GiftNoteBlock";
import { GiftSendBlock, type GiftSendBlockCopy, type GiftThankYouSendProps } from "./GiftSendBlock";

type GiftNoteAndSendBlocksProps = {
  noteCopy: GiftNoteCopy;
  sendCopy: GiftSendBlockCopy;
  note: GiftNote;
  noteEdit: { token: string } | null;
  send: GiftThankYouSendProps | null;
};

function withCurrentNote(status: GiftSendStatus, note: GiftNote): GiftSendStatus {
  if (status.state !== "ready" && status.state !== "sent") return status;
  return { ...status, buyerName: note.buyerFirstName, hasNote: note.text !== null };
}

export function GiftNoteAndSendBlocks({
  noteCopy,
  sendCopy,
  note,
  noteEdit,
  send,
}: GiftNoteAndSendBlocksProps) {
  const [currentNote, setCurrentNote] = useState(note);

  return (
    <>
      <GiftNoteBlock copy={noteCopy} note={note} noteEdit={noteEdit} onSaved={setCurrentNote} />
      {send ? (
        <GiftSendBlock
          copy={sendCopy}
          send={{ token: send.token, status: withCurrentNote(send.status, currentNote) }}
        />
      ) : null}
    </>
  );
}
