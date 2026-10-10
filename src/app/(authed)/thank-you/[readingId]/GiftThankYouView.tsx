import { Gift } from "lucide-react";

import { ThankYouShell } from "@/components/ThankYouShell";

import { GiftCardSurface } from "./CardSurface";
import { GiftCodeCard, type GiftCodeCardCopy } from "./GiftCodeCard";
import { GiftNoteAndSendBlocks } from "./GiftNoteAndSendBlocks";
import type { GiftNote, GiftNoteCopy } from "./GiftNoteBlock";
import type { GiftSendBlockCopy, GiftThankYouSendProps } from "./GiftSendBlock";

export type GiftThankYouCopy = GiftCodeCardCopy & {
  heading: string;
  subheading: string;
  thankYouOpenedNotice: string;
  pendingBody: string;
  note: GiftNoteCopy;
  send: GiftSendBlockCopy;
};

export type GiftThankYouViewProps =
  | {
      state: "active";
      copy: GiftThankYouCopy;
      displayCode: string;
      giftUrl: string;
      shareText: string;
      note: GiftNote;
      noteEdit: { token: string } | null;
      send: GiftThankYouSendProps | null;
    }
  | {
      state: "redeemed";
      copy: GiftThankYouCopy;
      displayCode: string;
      giftUrl: string;
      shareText: string;
    }
  | { state: "pending_payment"; copy: GiftThankYouCopy };

function GiftThankYouBody(props: GiftThankYouViewProps) {
  const { copy } = props;
  if (props.state === "pending_payment") {
    return (
      <GiftCardSurface label={copy.codeCardLabel}>
        <p className="font-body text-sm leading-relaxed text-j-text-muted">{copy.pendingBody}</p>
      </GiftCardSurface>
    );
  }

  const { codeCardLabel, copyLinkLabel, linkCopiedLabel, shareLabel, codeHelp } = copy;
  return (
    <>
      <GiftCodeCard
        copy={{ codeCardLabel, copyLinkLabel, linkCopiedLabel, shareLabel, codeHelp }}
        displayCode={props.displayCode}
        giftUrl={props.giftUrl}
        shareText={props.shareText}
      />
      {props.state === "active" ? (
        <GiftNoteAndSendBlocks
          noteCopy={copy.note}
          sendCopy={copy.send}
          note={props.note}
          noteEdit={props.noteEdit}
          send={props.send}
        />
      ) : (
        <p className="font-display italic text-base text-j-text-muted">
          {copy.thankYouOpenedNotice}
        </p>
      )}
    </>
  );
}

export function GiftThankYouView(props: GiftThankYouViewProps & { backGoesHome?: boolean }) {
  return (
    <ThankYouShell
      icon={Gift}
      heading={props.copy.heading}
      subheading={props.copy.subheading}
      backGoesHome={props.backGoesHome}
    >
      <div className="mt-10 max-w-md mx-auto flex flex-col gap-4">
        <GiftThankYouBody {...props} />
      </div>
    </ThankYouShell>
  );
}
