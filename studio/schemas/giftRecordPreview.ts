import { formatLongDate, trimmedStringOrNull } from "../lib/previewText";

function giftStatusLabel(status: unknown, sentAt: unknown): string {
  if (status === "cancelled") return "Cancelled";
  if (status === "redeemed") return "Opened";
  return trimmedStringOrNull(sentAt) ? "Sent by email" : "Waiting";
}

export function buildGiftRecordPreview(selection: Record<string, unknown>) {
  const buyer = trimmedStringOrNull(selection.buyerFirstName);
  const bought = formatLongDate(selection.paidAt);
  const subtitle = [
    buyer ? `From ${buyer}` : null,
    giftStatusLabel(selection.status, selection.sentAt),
    bought ? `Bought ${bought}` : null,
  ]
    .filter(Boolean)
    .join(" · ");
  return { title: trimmedStringOrNull(selection.readingName) ?? "Gift", subtitle };
}
