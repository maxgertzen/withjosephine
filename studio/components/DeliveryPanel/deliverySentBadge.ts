import type { DocumentBadgeComponent, DocumentBadgeProps } from "sanity";

import { findReadingDeliveryEntry } from "../../../src/lib/booking/emailFiredType";
import { type DeliveryPanelDocument, sentLine } from "./deliveryPanelModel";

export const deliverySentBadge: DocumentBadgeComponent = (props: DocumentBadgeProps) => {
  const published = props.published as DeliveryPanelDocument | null;
  if (published?.status !== "paid") return null;
  const deliveryEntry = findReadingDeliveryEntry(published.emailsFired);
  if (!deliveryEntry) return null;
  return { label: "Sent", title: sentLine(deliveryEntry.sentAt), color: "success" };
};
