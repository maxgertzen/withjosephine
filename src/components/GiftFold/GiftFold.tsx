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
  editTargets?: Partial<Record<keyof GiftFoldCopy, string>>;
  giftSheet: Omit<GiftSheetProps, "open" | "onClose">;
  redeemSheet: Omit<RedeemSheetProps, "open" | "onClose">;
  initialSheet?: GiftFoldSheet;
};

type GiftFoldActionProps = {
  lead: string;
  label: string;
  onClick: () => void;
  leadEditTarget?: string;
  labelEditTarget?: string;
};

function GiftFoldAction({ lead, label, onClick, leadEditTarget, labelEditTarget }: GiftFoldActionProps) {
  return (
    <div className="flex flex-col items-start gap-0.5 px-4 py-3">
      <span className="font-body text-[13px] text-j-text-muted-warm" data-sanity={leadEditTarget}>
        {lead}
      </span>
      <button
        type="button"
        onClick={onClick}
        data-sanity={labelEditTarget}
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
  editTargets,
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
      className="overflow-hidden rounded-[16px] border border-j-border-subtle bg-j-warm"
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
        <span data-sanity={editTargets?.giftRowLabel}>{copy.giftRowLabel}</span>
      </DisclosureButton>
      <AnimatedCollapse id={panelId} open={open} labelledBy={rowId} animated={toggled}>
        <div className="divide-y divide-j-border-subtle border-t border-j-border-subtle bg-j-cream">
          <GiftFoldAction
            lead={copy.buyLead}
            label={copy.buyLinkLabel}
            onClick={openGiftSheet}
            leadEditTarget={editTargets?.buyLead}
            labelEditTarget={editTargets?.buyLinkLabel}
          />
          <GiftFoldAction
            lead={copy.redeemLead}
            label={copy.redeemLinkLabel}
            onClick={openRedeemSheet}
            leadEditTarget={editTargets?.redeemLead}
            labelEditTarget={editTargets?.redeemLinkLabel}
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
