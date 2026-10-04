import type { GiftContent } from "@/data/defaults";
import { applyTokens } from "@/lib/emails/applyTokens";
import { bookingPath, homeReadingAnchor } from "@/lib/http/routes";

import type { GiftMessageViewProps } from "./GiftMessageView";
import type { GiftPageMessage } from "./resolveGiftRequest";

export type GiftMessageReading = { slug: string; tag: string; name: string; priceLabel: string };

const MESSAGE_COPY: Record<
  GiftPageMessage,
  (copy: GiftContent) => Pick<GiftMessageViewProps, "heading" | "body">
> = {
  already_opened: (copy) => ({ heading: copy.alreadyOpenedHeading, body: copy.alreadyOpenedBody }),
  no_longer_active: (copy) => ({
    heading: copy.noLongerActiveHeading,
    body: copy.noLongerActiveBody,
  }),
  not_found: (copy) => ({ heading: copy.notFoundHeading, body: copy.notFoundBody }),
  rate_limited: (copy) => ({ heading: copy.rateLimitedHeading, body: copy.rateLimitedBody }),
};

export function deriveGiftMessageViewProps(
  message: GiftPageMessage,
  reading: GiftMessageReading | null,
  copy: GiftContent,
): GiftMessageViewProps {
  return {
    ...MESSAGE_COPY[message](copy),
    backHref: reading ? homeReadingAnchor(reading.slug) : "/",
    reading: reading
      ? { tag: reading.tag, name: reading.name, priceLabel: reading.priceLabel }
      : null,
    action: reading
      ? {
          label: applyTokens(copy.bookYourselfTemplate, { reading: reading.name }),
          href: bookingPath(reading.slug),
        }
      : undefined,
  };
}
