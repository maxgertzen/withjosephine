import { GIFT_DEFAULTS, type GiftContent } from "@/data/defaults";
import { withNonBlankOverrides } from "@/lib/content/nonBlank";
import type { SanityGiftSettings } from "@/lib/sanity/types";

export function giftContent(settings: SanityGiftSettings | null): GiftContent {
  return withNonBlankOverrides(GIFT_DEFAULTS, settings);
}
