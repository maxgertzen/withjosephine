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
    confirmLine: "Sends the gift confirmation to the buyer again.",
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
  emailFailures?: FailureInput[];
  gift?: { emailFailures?: FailureInput[] };
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

type FailureInput = EmailFailurePreviewInput & { _key?: string };

function openFailedSendRows<TEmailType extends string>(
  failures: readonly FailureInput[] | undefined,
  parseType: (value: string | undefined) => TEmailType | null,
  preview: (failure: FailureInput) => { title: string; subtitle: string },
): Array<{
  key: string;
  emailType: TEmailType;
  kind: string | undefined;
  title: string;
  subtitle: string;
}> {
  return (failures ?? []).flatMap((failure, index) => {
    const emailType = parseType(failure.emailType);
    if (!emailType || failure.resolvedAt) return [];
    return [
      { key: failure._key ?? String(index), emailType, kind: failure.kind, ...preview(failure) },
    ];
  });
}

const ACTIONABLE_GIFT_EMAILS_BY_STATUS: Record<string, ReadonlySet<GiftEmailFiredType>> = {
  [GIFT_SUBMISSION_STATUS.waiting]: new Set(["gift_confirmation", "gift_send"]),
  paid: new Set(["gift_opened"]),
};

const UNDELIVERED_KINDS: ReadonlySet<string> = new Set(["bounced", "suppressed"]);

function isResendable(emailType: GiftEmailFiredType, kind: string | undefined): boolean {
  return emailType !== "gift_send" || UNDELIVERED_KINDS.has(kind ?? "");
}

function openGiftFailedSends(published: DeliveryPanelDocument): GiftFailedSendRow[] {
  const actionable = ACTIONABLE_GIFT_EMAILS_BY_STATUS[published.status ?? ""] ?? new Set();
  return openFailedSendRows(
    published.gift?.emailFailures,
    asGiftEmailType,
    prepareGiftEmailFailurePreview,
  )
    .filter((row) => actionable.has(row.emailType))
    .map(({ kind, ...row }) => ({ ...row, resendable: isResendable(row.emailType, kind) }));
}

const GIFT_WAITING_MODEL: Omit<DeliveryPanelModel, "resendLine" | "giftFailedSends"> = {
  statusLine: DELIVERY_COPY.giftWaiting,
  button: null,
  failedSends: [],
  resendTypes: [],
  defaultResendType: "order_confirmation",
};

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
    return { ...GIFT_WAITING_MODEL, resendLine, giftFailedSends };
  }
  const resendTypes: CustomerEmailType[] = hasBothFiles(published)
    ? ["order_confirmation", "reading_delivery"]
    : ["order_confirmation"];
  const failedSends = openFailedSendRows(
    published.emailFailures,
    asCustomerEmailType,
    prepareEmailFailurePreview,
  );
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
