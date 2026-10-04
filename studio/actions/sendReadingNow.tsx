import { EnvelopeIcon } from "@sanity/icons";
import { useToast } from "@sanity/ui";
import { useEffect, useRef, useState } from "react";
import {
  type DocumentActionComponent,
  type DocumentActionProps,
  type DocumentBadgeComponent,
  type DocumentBadgeProps,
  useClient,
} from "sanity";

import { findReadingDeliveryEntry } from "../../src/lib/booking/emailFiredType";
import { applyTokens } from "../../src/lib/emails/applyTokens";
import { dateTimeFormatter, REQUESTED_TOAST, STUDIO_API_VERSION } from "../lib/studioRequests";
import {
  requestBlocker,
  type SendReadingNowDocument,
  sendReadingNowState,
} from "./sendReadingNowState";

const SEND_LABEL = "Send reading now";
const FILES_MISSING_TITLE = "Upload the voice note and the PDF first.";
const READY_MESSAGE = "Sends the delivery email to {email}.";
const SENT_BADGE = "Sent";
const SENT_TITLE = "Delivery email sent {date}.";
const TRY_AGAIN_LABEL = "Try again";
const FAILED_TOAST = "The email didn't send. Try again, or tell Max.";
const UNPUBLISHED_TITLE = "Publish your changes first.";

const BLOCKER_TITLES = {
  filesMissing: FILES_MISSING_TITLE,
  unpublishedChanges: UNPUBLISHED_TITLE,
} as const;

function paidSubmission(published: unknown): SendReadingNowDocument | null {
  const document = published as SendReadingNowDocument | null;
  return document?.status === "paid" ? document : null;
}

function sentTitle(sentAt: string | undefined): string | undefined {
  const sentMs = sentAt ? Date.parse(sentAt) : Number.NaN;
  if (Number.isNaN(sentMs)) return undefined;
  return applyTokens(SENT_TITLE, { date: dateTimeFormatter.format(sentMs) });
}

export const sendReadingNowAction: DocumentActionComponent = (props: DocumentActionProps) => {
  const client = useClient({ apiVersion: STUDIO_API_VERSION });
  const toast = useToast();
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [isRequesting, setIsRequesting] = useState(false);
  const toastedFailureRef = useRef<string | null>(null);

  const published = paidSubmission(props.published);
  const state = published && sendReadingNowState({ published, draft: props.draft });
  const failedAt = state === "failed" ? published?.deliveryFailedAt : undefined;

  useEffect(() => {
    if (!failedAt || toastedFailureRef.current === failedAt) return;
    toastedFailureRef.current = failedAt;
    toast.push({ status: "error", title: FAILED_TOAST });
  }, [failedAt, toast]);

  async function requestDelivery() {
    setIsConfirmOpen(false);
    setIsRequesting(true);
    try {
      await client
        .patch(props.id)
        .set({ deliveryRequestedAt: new Date().toISOString() })
        .unset(["deliveryFailedAt"])
        .commit();
      toast.push({ status: "info", title: REQUESTED_TOAST });
      props.onComplete();
    } catch (error) {
      toast.push({
        status: "error",
        title: error instanceof Error ? error.message : String(error),
      });
    } finally {
      setIsRequesting(false);
    }
  }

  if (!published || !state || state === "sent") return null;

  const base = { label: SEND_LABEL, icon: EnvelopeIcon };

  if (state === "failed") {
    const blocker = requestBlocker({ published, draft: props.draft });
    return {
      ...base,
      label: TRY_AGAIN_LABEL,
      disabled: isRequesting || blocker !== null,
      title: blocker ? BLOCKER_TITLES[blocker] : undefined,
      onHandle: () => void requestDelivery(),
    };
  }

  if (state === "ready") {
    return {
      ...base,
      disabled: isRequesting,
      onHandle: () => setIsConfirmOpen(true),
      dialog: isConfirmOpen && {
        type: "confirm",
        message: applyTokens(READY_MESSAGE, { email: published.email }),
        onConfirm: () => void requestDelivery(),
        onCancel: () => setIsConfirmOpen(false),
      },
    };
  }

  return {
    ...base,
    disabled: true,
    title: state === "requested" ? undefined : BLOCKER_TITLES[state],
  };
};

export const sendReadingNowBadge: DocumentBadgeComponent = (props: DocumentBadgeProps) => {
  const deliveryEntry = findReadingDeliveryEntry(paidSubmission(props.published)?.emailsFired);
  if (!deliveryEntry) return null;
  return { label: SENT_BADGE, title: sentTitle(deliveryEntry.sentAt), color: "success" };
};
