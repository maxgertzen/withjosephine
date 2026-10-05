import {
  asCustomerEmailType,
  findReadingDeliveryEntry,
} from "../../../src/lib/booking/emailFiredType";
import { applyTokens } from "../../../src/lib/emails/applyTokens";
import { GIFT_SUBMISSION_STATUS } from "../../../src/lib/gift/giftSubmissionStatus";
import { asGiftEmailType, type GiftEmailFiredType } from "../../../src/lib/gift/types";
import type { CustomerEmailType } from "../../../src/lib/page-previews/types";
import { dateTimeFormatter } from "../../lib/studioRequests";
import {
  type EmailFailurePreviewInput,
  prepareEmailFailurePreview,
} from "../../schemas/emailFailurePreview";
import { prepareGiftEmailFailurePreview } from "../../schemas/giftEmailFailurePreview";

export const DELIVERY_COPY = {
  filesMissing: "Upload the voice note and the PDF first.",
  unpublishedChanges: "Publish your changes first.",
  ready: "Sends the delivery email to {email}.",
  requested: "Sending.",
  sent: "Delivery email sent {date}.",
  sentNoDate: "Delivery email sent.",
  failed: "The email didn't send. Try again, or tell Max.",
  resendRequested: "Resend requested. Sending.",
  giftWaiting: "Waiting for the recipient.",
} as const;

export const GIFT_RESEND_COPY: Record<GiftEmailFiredType, { label: string; confirmLine: string }> = {
  gift_confirmation: {
    label: "Resend",
    confirmLine: "Sends the gift confirmation to the buyer again.",
  },
  gift_send: {
    label: "Resend gift confirmation to buyer",
    confirmLine:
      "Sends the gift confirmation to the buyer again. The buyer can then send the gift again.",
  },
  gift_opened: {
    label: "Resend",
    confirmLine: "Sends the gift opened email to the buyer again.",
  },
};

type FileField = { asset?: unknown };

export type DeliveryPanelDocument = {
  status?: string;
  email?: string;
  voiceNote?: FileField;
  readingPdf?: FileField;
  emailsFired?: Array<{ type?: string; sentAt?: string }>;
  deliveryRequestedAt?: string;
  deliveryFailedAt?: string;
  emailResendRequest?: { requestedAt?: string };
  emailFailures?: Array<EmailFailurePreviewInput & { _key?: string }>;
  gift?: { emailFailures?: Array<EmailFailurePreviewInput & { _key?: string }> };
};

type GiftFailedSendRow = {
  key: string;
  emailType: GiftEmailFiredType;
  title: string;
  subtitle: string;
  resendable: boolean;
};

type FailedSendRow = {
  key: string;
  emailType: CustomerEmailType;
  title: string;
  subtitle: string;
};

type DeliveryPanelModel = {
  statusLine: string;
  button: { kind: "send" | "tryAgain"; enabled: boolean } | null;
  failedSends: FailedSendRow[];
  resendTypes: CustomerEmailType[];
  defaultResendType: CustomerEmailType;
  resendLine: string | null;
  giftFailedSends: GiftFailedSendRow[];
};

export const showsDeliveryBox = (status: unknown) =>
  status === "paid" || status === GIFT_SUBMISSION_STATUS.waiting;

export function sentLine(sentAt: string | undefined): string {
  const sentMs = sentAt ? Date.parse(sentAt) : Number.NaN;
  if (Number.isNaN(sentMs)) return DELIVERY_COPY.sentNoDate;
  return applyTokens(DELIVERY_COPY.sent, { date: dateTimeFormatter.format(sentMs) });
}

function hasBothFiles(published: DeliveryPanelDocument): boolean {
  return Boolean(published.voiceNote?.asset && published.readingPdf?.asset);
}

function sendBlocker(
  published: DeliveryPanelDocument,
  hasDraft: boolean,
): "filesMissing" | "unpublishedChanges" | null {
  if (!hasBothFiles(published)) return "filesMissing";
  return hasDraft ? "unpublishedChanges" : null;
}

function sendSection(
  published: DeliveryPanelDocument,
  hasDraft: boolean,
): Pick<DeliveryPanelModel, "statusLine" | "button"> {
  const deliveryEntry = findReadingDeliveryEntry(published.emailsFired);
  if (deliveryEntry) return { statusLine: sentLine(deliveryEntry.sentAt), button: null };
  if (published.deliveryRequestedAt) return { statusLine: DELIVERY_COPY.requested, button: null };
  const blocker = sendBlocker(published, hasDraft);
  if (published.deliveryFailedAt) {
    return { statusLine: DELIVERY_COPY.failed, button: { kind: "tryAgain", enabled: !blocker } };
  }
  if (blocker) return { statusLine: DELIVERY_COPY[blocker], button: { kind: "send", enabled: false } };
  return {
    statusLine: applyTokens(DELIVERY_COPY.ready, { email: published.email ?? "" }),
    button: { kind: "send", enabled: true },
  };
}

function openFailedSends(published: DeliveryPanelDocument): FailedSendRow[] {
  return (published.emailFailures ?? []).flatMap((failure, index) => {
    const emailType = asCustomerEmailType(failure.emailType);
    if (!emailType || failure.resolvedAt) return [];
    return [{ key: failure._key ?? String(index), emailType, ...prepareEmailFailurePreview(failure) }];
  });
}

const GIFT_RESENDABLE_BY_STATUS: Record<string, ReadonlySet<GiftEmailFiredType>> = {
  [GIFT_SUBMISSION_STATUS.waiting]: new Set(["gift_confirmation", "gift_send"]),
  paid: new Set(["gift_opened"]),
};

function openGiftFailedSends(published: DeliveryPanelDocument): GiftFailedSendRow[] {
  const resendable = GIFT_RESENDABLE_BY_STATUS[published.status ?? ""] ?? new Set();
  return (published.gift?.emailFailures ?? []).flatMap((failure, index) => {
    const emailType = asGiftEmailType(failure.emailType);
    if (!emailType || failure.resolvedAt) return [];
    return [
      {
        key: failure._key ?? String(index),
        emailType,
        ...prepareGiftEmailFailurePreview(failure),
        resendable: resendable.has(emailType),
      },
    ];
  });
}

export function deliveryPanelModel(versions: {
  published: DeliveryPanelDocument;
  draft?: unknown;
}): DeliveryPanelModel {
  const { published } = versions;
  const hasDraft = Boolean(versions.draft);
  const resendLine = published.emailResendRequest?.requestedAt
    ? DELIVERY_COPY.resendRequested
    : hasDraft
      ? DELIVERY_COPY.unpublishedChanges
      : null;
  const giftFailedSends = openGiftFailedSends(published);
  if (published.status === GIFT_SUBMISSION_STATUS.waiting) {
    return {
      statusLine: DELIVERY_COPY.giftWaiting,
      button: null,
      failedSends: [],
      resendTypes: [],
      defaultResendType: "order_confirmation",
      resendLine,
      giftFailedSends,
    };
  }
  const resendTypes: CustomerEmailType[] = hasBothFiles(published)
    ? ["order_confirmation", "reading_delivery"]
    : ["order_confirmation"];
  const failedSends = openFailedSends(published);
  const firstResendable = failedSends.find((failure) => resendTypes.includes(failure.emailType));
  return {
    ...sendSection(published, hasDraft),
    failedSends,
    resendTypes,
    defaultResendType: firstResendable?.emailType ?? "order_confirmation",
    resendLine,
    giftFailedSends,
  };
}
