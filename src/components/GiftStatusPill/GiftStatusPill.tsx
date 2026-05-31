"use client";

import { format, parseISO } from "date-fns";
import {
  CalendarClock,
  CheckCircle2,
  Hourglass,
  Mail,
  Sparkles,
  XCircle,
} from "lucide-react";
import { useEffect, useState } from "react";

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

function formatMoment(iso: string): string {
  return format(parseISO(iso), DATE_FORMAT);
}

type LabelParts = { label: string; momentIso?: string };

function labelPartsFor(status: GiftStatus, copy: GiftStatusCopy): LabelParts {
  switch (status.kind) {
    case GIFT_STATUS_KIND.scheduled:
      return { label: copy.statusScheduledLabel, momentIso: status.sendAt };
    case GIFT_STATUS_KIND.selfSendReady:
      return { label: copy.statusSelfSendReadyLabel };
    case GIFT_STATUS_KIND.sentWaitingRecipient:
      return { label: copy.statusSentLabel };
    case GIFT_STATUS_KIND.recipientPreparing:
      return { label: copy.statusPreparingLabel };
    case GIFT_STATUS_KIND.delivered:
      return { label: copy.statusDeliveredLabel, momentIso: status.deliveredAt };
    case GIFT_STATUS_KIND.cancelled:
      return { label: copy.statusCancelledLabel };
  }
}

export type GiftStatusPillProps = {
  status: GiftStatus;
  copy: GiftStatusCopy;
  className?: string;
};

export function GiftStatusPill({ status, copy, className }: GiftStatusPillProps) {
  const Icon = STATUS_ICON[status.kind];
  const { label, momentIso } = labelPartsFor(status, copy);

  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

  const moment = mounted && momentIso ? formatMoment(momentIso) : "";
  const fullLabel = moment ? `${label} ${moment}` : label;

  return (
    <span
      role="status"
      aria-label={fullLabel}
      data-status={status.kind}
      className={mergeClasses(PILL_BASE_CLASSES, className)}
    >
      <Icon data-pill-icon className={ICON_CLASSES} aria-hidden="true" />
      <span>{fullLabel}</span>
    </span>
  );
}
