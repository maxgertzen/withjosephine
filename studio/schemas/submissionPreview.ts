const longDateFormatter = new Intl.DateTimeFormat("en-GB", { dateStyle: "medium" });

const DAY_MS = 24 * 60 * 60 * 1000;
const DELIVERY_WINDOW_DAYS = 7;
const GIFT_DELIVERY_TARGET_DAYS = 7;

function parseIso(value: unknown): Date | null {
  if (typeof value !== "string" || value === "") return null;
  const parsed = Date.parse(value);
  return Number.isNaN(parsed) ? null : new Date(parsed);
}

function formatLong(value: unknown): string | null {
  const date = parseIso(value);
  return date ? longDateFormatter.format(date) : null;
}

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

function pluralizeDays(n: number): string {
  return Math.abs(n) === 1 ? "day" : "days";
}

export function giftDeliveryCountdown(claimedAtValue: unknown, now: Date): string | null {
  const claimedAt = parseIso(claimedAtValue);
  if (!claimedAt) return null;
  const elapsedMs = now.getTime() - claimedAt.getTime();
  if (elapsedMs < 0 && process.env.NODE_ENV === "development") {
    // Future-dated giftClaimedAt is silently clamped to the full window
    // ("7 days left"). Surface a dev-only warning so Studio editors notice
    // the data anomaly during local work (gated to NODE_ENV=development to
    // keep production + test output clean).
    console.warn(
      "[submissionPreview] giftClaimedAt is in the future; countdown clamped to full window",
      { claimedAt: claimedAt.toISOString(), now: now.toISOString() },
    );
  }
  const daysElapsed = elapsedMs > 0 ? Math.floor(elapsedMs / DAY_MS) : 0;
  const daysRemaining = GIFT_DELIVERY_TARGET_DAYS - daysElapsed;
  if (daysRemaining > 0) return `${daysRemaining} ${pluralizeDays(daysRemaining)} left to deliver`;
  if (daysRemaining === 0) return "Due today";
  const overdue = Math.abs(daysRemaining);
  return `Overdue by ${overdue} ${pluralizeDays(overdue)}`;
}

export function statusLabel(args: {
  status: unknown;
  isGift: unknown;
  giftClaimedAt: unknown;
  deliveredAt: unknown;
  now: Date;
}): string | null {
  if (args.status !== "paid") return null;
  if (args.isGift !== true) return null;
  if (args.deliveredAt) return null;
  const countdown = giftDeliveryCountdown(args.giftClaimedAt, args.now);
  return countdown ? `Claimed · ${countdown}` : "Paid · awaiting claim";
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
    const deliveredLabel = `Delivered ${longDateFormatter.format(deliveredDate)}`;
    const listenedLabel = formatLong(args.listenedAt);
    return listenedLabel ? `${deliveredLabel} · Listened ${listenedLabel}` : deliveredLabel;
  }

  const paidDate = parseIso(args.paidAt);
  if (args.status === "paid" && paidDate) {
    return `Paid ${longDateFormatter.format(paidDate)} · ${dayCounter(paidDate, args.now)}`;
  }

  const createdLabel = formatLong(args.createdAt);
  if (createdLabel && args.status !== "expired") {
    return `Submitted ${createdLabel}`;
  }

  return typeof args.status === "string" && args.status !== "" ? args.status : "pending";
}

function trimmedStringOrNull(value: unknown): string | null {
  return typeof value === "string" && value.trim() !== "" ? value.trim() : null;
}

// Gift submissions carry two addresses: `email` is the purchaser, `recipientEmail`
// is who actually receives the reading. Showing the bare purchaser email misled
// Becky on recipient-claimed gifts, so when a distinct recipient address exists
// we label both. An unclaimed gift (no recipientEmail yet) keeps the bare email.
function identityLine(selection: Record<string, unknown>): string | null {
  const email = trimmedStringOrNull(selection.email);
  const recipientEmail =
    selection.isGift === true ? trimmedStringOrNull(selection.recipientEmail) : null;
  if (!recipientEmail) return email;
  return email
    ? `Purchaser ${email} · Recipient ${recipientEmail}`
    : `Recipient ${recipientEmail}`;
}

export function buildPreview(selection: Record<string, unknown>, now: Date) {
  const fullName = fullNameOrNull(selection.responses);
  const identity = identityLine(selection);
  const dates = buildDates({
    status: selection.status,
    createdAt: selection.createdAt,
    paidAt: selection.paidAt,
    deliveredAt: selection.deliveredAt,
    listenedAt: selection.listenedAt,
    now,
  });
  const claim = statusLabel({
    status: selection.status,
    isGift: selection.isGift,
    giftClaimedAt: selection.giftClaimedAt,
    deliveredAt: selection.deliveredAt,
    now,
  });

  const datesWithClaim = claim ? `${claim} · ${dates}` : dates;

  if (fullName) {
    const subtitleParts = identity ? [identity, datesWithClaim] : [datesWithClaim];
    return { title: fullName, subtitle: subtitleParts.join(" · ") };
  }
  if (identity) {
    return { title: identity, subtitle: datesWithClaim };
  }
  return { title: "no name", subtitle: datesWithClaim };
}

export function prepareSubmissionPreview(selection: Record<string, unknown>) {
  return buildPreview(selection, new Date());
}
