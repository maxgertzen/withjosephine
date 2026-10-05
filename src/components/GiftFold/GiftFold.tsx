"use client";

import { Gift } from "lucide-react";
import dynamic from "next/dynamic";
import { useState } from "react";

import { AnimatedCollapse } from "@/components/AnimatedCollapse";
import type { GiftSheetProps } from "@/components/GiftSheet";
import { DisclosureButton } from "@/components/ReadingBlock/DisclosureButton";
import type { RedeemSheetProps } from "@/components/RedeemSheet";
import { goldLinkClasses } from "@/lib/textStyles";

import type { GiftFoldCopy } from "./giftFoldCopy";

const loadGiftSheet = () => import("@/components/GiftSheet").then((module) => module.GiftSheet);
const loadRedeemSheet = () =>
  import("@/components/RedeemSheet").then((module) => module.RedeemSheet);

function reloadForNewBuild(): Promise<never> {
  window.location.reload();
  return new Promise(() => {});
}

const GiftSheet = dynamic(() => loadGiftSheet().catch(reloadForNewBuild));
const RedeemSheet = dynamic(() => loadRedeemSheet().catch(reloadForNewBuild));

function preloadSheets() {
  void loadGiftSheet().catch(() => undefined);
  void loadRedeemSheet().catch(() => undefined);
}

export type GiftFoldSheet = "gift" | "redeem";

export type GiftFoldProps = {
  readingSlug: string;
  copy: GiftFoldCopy;
  giftSheet: Omit<GiftSheetProps, "open" | "onClose">;
  redeemSheet: Omit<RedeemSheetProps, "open" | "onClose">;
  initialSheet?: GiftFoldSheet;
};

type GiftFoldActionProps = {
  lead: string;
  label: string;
  onClick: () => void;
};

function GiftFoldAction({ lead, label, onClick }: GiftFoldActionProps) {
  return (
    <div className="flex flex-col items-start gap-0.5 px-4 py-3">
      <span className="font-body text-[13px] text-j-text-muted-warm">{lead}</span>
      <button
        type="button"
        onClick={onClick}
        className={`${goldLinkClasses} text-left font-display text-lg italic`}
      >
        {label}
      </button>
    </div>
  );
}

export function GiftFold({
  readingSlug,
  copy,
  giftSheet,
  redeemSheet,
  initialSheet,
}: GiftFoldProps) {
  const [open, setOpen] = useState(Boolean(initialSheet));
  const [toggled, setToggled] = useState(false);
  const [sheet, setSheet] = useState<GiftFoldSheet | null>(initialSheet ?? null);
  const [giftSheetLoaded, setGiftSheetLoaded] = useState(sheet === "gift");
  const [redeemKey, setRedeemKey] = useState(sheet === "redeem" ? 1 : 0);
  const panelId = `${readingSlug}-gift-fold`;
  const rowId = `${readingSlug}-gift-fold-row`;
  const closeSheet = () => setSheet(null);
  const openGiftSheet = () => {
    setGiftSheetLoaded(true);
    setSheet("gift");
  };
  const openRedeemSheet = () => {
    setRedeemKey((count) => count + 1);
    setSheet("redeem");
  };

  return (
    <section
      data-testid="gift-fold"
      className="mb-9 overflow-hidden rounded-[16px] border border-j-border-subtle bg-j-warm"
    >
      <DisclosureButton
        id={rowId}
        controls={panelId}
        open={open}
        onToggle={() => {
          preloadSheets();
          setToggled(true);
          setOpen((previous) => !previous);
        }}
        icon={
          <Gift
            aria-hidden="true"
            size={18}
            strokeWidth={1.5}
            className="shrink-0 text-j-ornament"
          />
        }
        className="gap-2.5 px-[18px] py-3.5 text-[17px]"
      >
        {copy.giftRowLabel}
      </DisclosureButton>
      <AnimatedCollapse id={panelId} open={open} labelledBy={rowId} animated={toggled}>
        <div className="divide-y divide-j-border-subtle border-t border-j-border-subtle bg-j-cream">
          <GiftFoldAction lead={copy.buyLead} label={copy.buyLinkLabel} onClick={openGiftSheet} />
          <GiftFoldAction
            lead={copy.redeemLead}
            label={copy.redeemLinkLabel}
            onClick={openRedeemSheet}
          />
        </div>
      </AnimatedCollapse>
      {giftSheetLoaded ? (
        <GiftSheet {...giftSheet} open={sheet === "gift"} onClose={closeSheet} />
      ) : null}
      {redeemKey > 0 ? (
        <RedeemSheet
          key={redeemKey}
          {...redeemSheet}
          open={sheet === "redeem"}
          onClose={closeSheet}
        />
      ) : null}
    </section>
  );
}
