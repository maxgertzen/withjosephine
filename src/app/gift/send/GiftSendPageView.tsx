import { CelestialOrb } from "@/components/CelestialOrb";
import { Footer } from "@/components/Footer";
import { GiftDisc } from "@/components/GiftDisc";
import { GIFT_SEND_COPY_KEYS, GiftSendForm } from "@/components/GiftSendForm";
import { StarField } from "@/components/StarField";
import type { GiftContent } from "@/data/defaults";
import { PAGE_ORBS } from "@/lib/celestialPresets";
import { applyTokens } from "@/lib/emails/applyTokens";
import type { GiftSendStatus } from "@/lib/gift/giftSendContract";

export const GIFT_SEND_PAGE_COPY_KEYS = [
  ...GIFT_SEND_COPY_KEYS,
  "sendPageHeadingTemplate",
] as const satisfies readonly (keyof GiftContent)[];

export type GiftSendPageCopy = Pick<GiftContent, (typeof GIFT_SEND_PAGE_COPY_KEYS)[number]>;

export type GiftSendPageViewProps = {
  copy: GiftSendPageCopy;
  status: GiftSendStatus | null;
  token: string;
  disabled?: boolean;
};

function namedReadyHeading(status: GiftSendStatus, copy: GiftSendPageCopy): string | undefined {
  if (status.state !== "ready" || !status.recipientName) return undefined;
  return applyTokens(copy.sendPageHeadingTemplate, { recipientName: status.recipientName });
}

export function GiftSendPageView({ copy, status, token, disabled }: GiftSendPageViewProps) {
  return (
    <div className="relative min-h-screen overflow-hidden bg-j-cream">
      <StarField count={30} className="opacity-[0.03]" />
      {PAGE_ORBS.map((orb, index) => (
        <CelestialOrb key={index} {...orb} />
      ))}
      <main className="relative z-10 mx-auto flex max-w-md flex-col items-center gap-6 px-6 py-16 text-center">
        <GiftDisc className="mb-0" />
        {status ? (
          <GiftSendForm
            token={token}
            status={status}
            copy={copy}
            disabled={disabled}
            readyHeading={namedReadyHeading(status, copy)}
          />
        ) : (
          <div
            aria-busy="true"
            className="min-h-48 w-full rounded-sm border border-j-blush bg-j-ivory shadow-j-card"
          />
        )}
      </main>
      <Footer />
    </div>
  );
}
