import type { ReactNode } from "react";

import { GoldDivider } from "@/components/GoldDivider";

type GiftMessageCardProps = {
  heading: string;
  body: ReactNode;
  action?: ReactNode;
};

export function GiftMessageCard({ heading, body, action }: GiftMessageCardProps) {
  return (
    <div className="relative w-full rounded-sm border border-j-blush bg-j-ivory shadow-j-card">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-2 rounded-[1px] border border-j-border-gold"
      />
      <div className="relative flex flex-col items-center gap-2.5 px-[22px] py-7 text-center">
        <span aria-hidden="true" className="text-xl text-j-ornament">
          ✦
        </span>
        <h2 className="m-0 font-display text-[1.6rem] font-normal italic leading-[1.2] text-j-text-heading">
          {heading}
        </h2>
        <GoldDivider className="w-32" />
        <div className="font-body text-[15px] leading-[1.6] text-j-text">{body}</div>
        {action ? <div className="mt-1 w-full">{action}</div> : null}
      </div>
    </div>
  );
}
