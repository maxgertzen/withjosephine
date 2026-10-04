import type { BookingFormViewProps } from "@/app/book/[readingId]/BookingFormView";
import { loadBookingFormViewProps } from "@/app/book/[readingId]/loadBookingFormViewProps";
import type { GiftFoldSheet } from "@/components/GiftFold";

export async function loadPreviewBookingFormProps(
  slug: string,
  initialSheet?: GiftFoldSheet,
): Promise<BookingFormViewProps | null> {
  const props = await loadBookingFormViewProps(slug, "preview");
  if (!props?.giftFold) return props;

  const { giftFold } = props;
  return {
    ...props,
    giftFold: {
      ...giftFold,
      giftSheet: { ...giftFold.giftSheet, endpoint: null },
      redeemSheet: { ...giftFold.redeemSheet, endpoint: null },
      initialSheet,
    },
  };
}
