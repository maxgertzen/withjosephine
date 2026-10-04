"use client";

import { useState } from "react";

import { Button } from "@/components/Button";
import { type GiftSendCopy, GiftSendForm } from "@/components/GiftSendForm";
import { GoldDivider } from "@/components/GoldDivider";
import type { GiftContent } from "@/data/defaults";
import type { GiftSendStatus } from "@/lib/gift/giftSendContract";

export type GiftSendBlockCopy = GiftSendCopy & Pick<GiftContent, "sendOpenLabel">;

export type GiftThankYouSendProps = {
  token: string;
  status: GiftSendStatus;
};

type GiftSendBlockProps = {
  copy: GiftSendBlockCopy;
  send: GiftThankYouSendProps;
};

export function GiftSendBlock({ copy, send }: GiftSendBlockProps) {
  const [isOpen, setIsOpen] = useState(false);

  if (isOpen) {
    return <GiftSendForm token={send.token} status={send.status} copy={copy} />;
  }

  return (
    <div className="flex flex-col items-center gap-4">
      <GoldDivider className="w-32" />
      <Button
        type="button"
        variant="outlined"
        onClick={() => setIsOpen(true)}
        className="w-full min-h-11 indent-[0.12em]"
      >
        {copy.sendOpenLabel}
      </Button>
    </div>
  );
}
