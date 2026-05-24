import { format, parseISO } from "date-fns";
import {
  CalendarClock,
  CheckCircle2,
  Hourglass,
  Mail,
  Sparkles,
  XCircle,
} from "lucide-react";

import type { MyGiftsPageContent } from "@/data/defaults";
import { GIFT_STATUS_KIND } from "@/lib/booking/constants";
import type { GiftStatus } from "@/lib/booking/giftStatus";
import { mergeClasses } from "@/lib/utils";

type GiftStatusCopy = Pick<
  MyGiftsPageContent,
  | "statusScheduledLabel"
  | "statusSelfSendReadyLabel"
  | "statusSentLabel"
  | "statusPreparingLabel"
  | "statusDeliveredLabel"
  | "statusCancelledLabel"
>;

const DATE_FORMAT = "MMMM d, yyyy 'at' h:mm a";

const PILL_BASE_CLASSES =
  "inline-flex items-center gap-1.5 rounded-full border border-j-status-pill-border px-3 py-1 font-body text-xs text-j-text-heading whitespace-nowrap";

const ICON_CLASSES = "h-3.5 w-3.5 flex-none";

const STATUS_ICON: Record<GiftStatus["kind"], typeof CalendarClock> = {
  [GIFT_STATUS_KIND.scheduled]: CalendarClock,
  [GIFT_STATUS_KIND.selfSendReady]: Sparkles,
  [GIFT_STATUS_KIND.sentWaitingRecipient]: Mail,
  [GIFT_STATUS_KIND.recipientPreparing]: Hourglass,
  [GIFT_STATUS_KIND.delivered]: CheckCircle2,
  [GIFT_STATUS_KIND.cancelled]: XCircle,
};

function formatScheduledMoment(iso: string): string {
  return format(parseISO(iso), DATE_FORMAT);
}

function labelFor(status: GiftStatus, copy: GiftStatusCopy): string {
  switch (status.kind) {
    case GIFT_STATUS_KIND.scheduled:
      return `${copy.statusScheduledLabel} ${formatScheduledMoment(status.sendAt)}`;
    case GIFT_STATUS_KIND.selfSendReady:
      return copy.statusSelfSendReadyLabel;
    case GIFT_STATUS_KIND.sentWaitingRecipient:
      return copy.statusSentLabel;
    case GIFT_STATUS_KIND.recipientPreparing:
      return copy.statusPreparingLabel;
    case GIFT_STATUS_KIND.delivered:
      return `${copy.statusDeliveredLabel} ${formatScheduledMoment(status.deliveredAt)}`;
    case GIFT_STATUS_KIND.cancelled:
      return copy.statusCancelledLabel;
  }
}

export type GiftStatusPillProps = {
  status: GiftStatus;
  copy: GiftStatusCopy;
  className?: string;
};

export function GiftStatusPill({ status, copy, className }: GiftStatusPillProps) {
  const Icon = STATUS_ICON[status.kind];
  const label = labelFor(status, copy);

  return (
    <span
      role="status"
      aria-label={label}
      data-status={status.kind}
      className={mergeClasses(PILL_BASE_CLASSES, className)}
    >
      <Icon data-pill-icon className={ICON_CLASSES} aria-hidden="true" />
      <span>{label}</span>
    </span>
  );
}
