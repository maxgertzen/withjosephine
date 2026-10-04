import { formatDate, formatLongDate, parseIso, trimmedStringOrNull } from "../lib/previewText";

const DAY_MS = 24 * 60 * 60 * 1000;
const DELIVERY_WINDOW_DAYS = 7;

function responseValue(responses: unknown, key: string): string | null {
  if (!Array.isArray(responses)) return null;
  for (const entry of responses) {
    if (typeof entry?.value !== "string") continue;
    const trimmed = entry.value.trim();
    if (entry.fieldKey === key && trimmed !== "") return trimmed;
  }
  return null;
}

function fullNameOrNull(responses: unknown): string | null {
  const first = responseValue(responses, "first_name");
  const last = responseValue(responses, "last_name");
  return first && last ? `${first} ${last}` : null;
}

function dayCounter(paidAt: Date, now: Date): string {
  const elapsed = Math.max(0, now.getTime() - paidAt.getTime());
  const day = Math.max(1, Math.floor(elapsed / DAY_MS) + 1);
  return day > DELIVERY_WINDOW_DAYS
    ? `Day ${day} — overdue`
    : `Day ${day} of ${DELIVERY_WINDOW_DAYS}`;
}

function buildDates(args: {
  status: unknown;
  createdAt: unknown;
  paidAt: unknown;
  deliveredAt: unknown;
  listenedAt: unknown;
  now: Date;
}): string {
  const deliveredDate = parseIso(args.deliveredAt);
  if (deliveredDate) {
    const deliveredLabel = `Delivered ${formatDate(deliveredDate)}`;
    const listenedLabel = formatLongDate(args.listenedAt);
    return listenedLabel ? `${deliveredLabel} · Listened ${listenedLabel}` : deliveredLabel;
  }

  const paidDate = parseIso(args.paidAt);
  if (args.status === "paid" && paidDate) {
    return `Paid ${formatDate(paidDate)} · ${dayCounter(paidDate, args.now)}`;
  }

  const createdLabel = formatLongDate(args.createdAt);
  if (createdLabel && args.status !== "expired") {
    return `Submitted ${createdLabel}`;
  }

  return typeof args.status === "string" && args.status !== "" ? args.status : "pending";
}

function identityLine(selection: Record<string, unknown>): string | null {
  return trimmedStringOrNull(selection.email);
}

export function buildPreview(selection: Record<string, unknown>, now: Date) {
  const fullName = fullNameOrNull(selection.responses);
  const identity = identityLine(selection);
  const giftBuyer = trimmedStringOrNull(selection.giftBuyerFirstName);
  const statusLine = [
    giftBuyer ? `Gift from ${giftBuyer}` : null,
    buildDates({
      status: selection.status,
      createdAt: selection.createdAt,
      paidAt: selection.paidAt,
      deliveredAt: selection.deliveredAt,
      listenedAt: selection.listenedAt,
      now,
    }),
  ]
    .filter(Boolean)
    .join(" · ");

  if (fullName) {
    const subtitleParts = identity ? [identity, statusLine] : [statusLine];
    return { title: fullName, subtitle: subtitleParts.join(" · ") };
  }
  if (identity) {
    return { title: identity, subtitle: statusLine };
  }
  return { title: "no name", subtitle: statusLine };
}

export function prepareSubmissionPreview(selection: Record<string, unknown>) {
  return buildPreview(selection, new Date());
}
