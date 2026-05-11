const longDateFormatter = new Intl.DateTimeFormat("en-GB", { dateStyle: "medium" });

const DAY_MS = 24 * 60 * 60 * 1000;
const DELIVERY_WINDOW_DAYS = 7;

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

export function buildPreview(selection: Record<string, unknown>, now: Date) {
  const fullName = fullNameOrNull(selection.responses);
  const email = typeof selection.email === "string" && selection.email !== "" ? selection.email : null;
  const dates = buildDates({
    status: selection.status,
    createdAt: selection.createdAt,
    paidAt: selection.paidAt,
    deliveredAt: selection.deliveredAt,
    listenedAt: selection.listenedAt,
    now,
  });

  if (fullName) {
    const subtitleParts = email ? [email, dates] : [dates];
    return { title: fullName, subtitle: subtitleParts.join(" · ") };
  }
  if (email) {
    return { title: email, subtitle: dates };
  }
  return { title: "no name", subtitle: dates };
}

export function prepareSubmissionPreview(selection: Record<string, unknown>) {
  return buildPreview(selection, new Date());
}
