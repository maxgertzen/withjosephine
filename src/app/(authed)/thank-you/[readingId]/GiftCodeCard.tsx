"use client";

import { useState } from "react";

import { Button } from "@/components/Button";
import { CLARITY_MASK_PROPS } from "@/lib/clarity";
import { copyText } from "@/lib/clipboard";
import { useFirstClientRead } from "@/lib/hooks/useFirstClientRead";

import { GiftCardSurface } from "./CardSurface";

export type GiftCodeCardCopy = {
  codeCardLabel: string;
  copyLinkLabel: string;
  linkCopiedLabel: string;
  shareLabel: string;
  codeHelp: string;
};

type GiftCodeCardProps = {
  copy: GiftCodeCardCopy;
  displayCode: string;
  giftUrl: string;
  shareText: string;
};

const ROW_BUTTON_CLASSES = "sm:flex-1 min-h-11 px-3 indent-[0.12em]";

export function GiftCodeCard({ copy, displayCode, giftUrl, shareText }: GiftCodeCardProps) {
  const [linkCopied, setLinkCopied] = useState(false);
  const [showsManualCopy, setShowsManualCopy] = useState(false);
  const canShare = useFirstClientRead(() => typeof navigator.share === "function");

  async function copyLink() {
    if (await copyText(giftUrl)) setLinkCopied(true);
    else setShowsManualCopy(true);
  }

  function share() {
    navigator.share({ text: shareText, url: giftUrl }).catch(() => undefined);
  }

  return (
    <GiftCardSurface label={copy.codeCardLabel}>
      <p
        {...CLARITY_MASK_PROPS}
        data-testid="gift-code"
        className="font-body font-medium text-lg min-[360px]:text-xl sm:text-2xl leading-tight tracking-[0.14em] tabular-nums whitespace-nowrap text-j-deep"
      >
        {displayCode}
      </p>
      <div className="flex flex-col sm:flex-row gap-2.5">
        <Button type="button" onClick={copyLink} className={ROW_BUTTON_CLASSES}>
          {linkCopied ? copy.linkCopiedLabel : copy.copyLinkLabel}
        </Button>
        {canShare ? (
          <Button type="button" variant="outlined" onClick={share} className={ROW_BUTTON_CLASSES}>
            {copy.shareLabel}
          </Button>
        ) : null}
      </div>
      {showsManualCopy ? (
        <input
          {...CLARITY_MASK_PROPS}
          type="text"
          readOnly
          value={giftUrl}
          aria-label={copy.copyLinkLabel}
          onFocus={(event) => event.currentTarget.select()}
          className="w-full min-h-11 rounded-lg border border-j-border-subtle bg-white/50 px-3 font-body text-sm text-j-text focus:outline-none focus:border-j-text-gold"
        />
      ) : null}
      <p className="font-body text-xs text-j-text-muted">{copy.codeHelp}</p>
    </GiftCardSurface>
  );
}
