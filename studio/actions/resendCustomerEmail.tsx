import { EnvelopeIcon } from "@sanity/icons";
import { Box, Button, Select, Stack, Text, TextInput, useToast } from "@sanity/ui";
import { useState } from "react";
import { type DocumentActionComponent, type DocumentActionProps, useClient } from "sanity";

import { asCustomerEmailType } from "../../src/lib/booking/emailFiredType";
import { isValidEmail } from "../../src/lib/formStyles";
import type { CustomerEmailType } from "../../src/lib/page-previews/types";
import { REQUESTED_TOAST, STUDIO_API_VERSION } from "../lib/studioRequests";
import { EMAIL_TYPE_LABELS } from "../schemas/emailFailurePreview";

const ACTION_LABEL = "Resend customer email…";
const REQUESTED_LABEL = "Resend requested";
const REQUESTED_TITLE = "Sending within 5 minutes.";
const UNPUBLISHED_TITLE = "Publish your changes first.";
const DIALOG_HEADER = "Resend customer email";
const DIALOG_INTRO =
  "Sends the email again. If the address was wrong, type the right one: it replaces the address on the order and for future sign-in links. Up to 3 resends per email in 24 hours.";
const EMAIL_TYPE_LABEL = "Email to resend";
const SEND_TO_LABEL = "Send to";
const INVALID_ADDRESS = "This is not a valid email address.";
const SUBMIT_LABEL = "Resend";

type ResendSubmissionDocument = {
  status?: string;
  email?: string;
  emailResendRequest?: { requestedAt?: string };
  emailFailures?: Array<{ emailType?: string; resolvedAt?: string }>;
};

function defaultEmailType(document: ResendSubmissionDocument): CustomerEmailType {
  const openFailure = document.emailFailures?.find((failure) => !failure.resolvedAt);
  return openFailure?.emailType === "reading_delivery" ? "reading_delivery" : "order_confirmation";
}

export const resendCustomerEmailAction: DocumentActionComponent = (
  props: DocumentActionProps,
) => {
  const client = useClient({ apiVersion: STUDIO_API_VERSION });
  const toast = useToast();
  const document = props.published as ResendSubmissionDocument | null;
  const [isOpen, setIsOpen] = useState(false);
  const [isPending, setIsPending] = useState(false);
  const [emailType, setEmailType] = useState<CustomerEmailType>("order_confirmation");
  const [sendTo, setSendTo] = useState("");

  if (!document || document.status !== "paid") return null;

  if (document.emailResendRequest?.requestedAt) {
    return { label: REQUESTED_LABEL, icon: EnvelopeIcon, disabled: true, title: REQUESTED_TITLE };
  }
  if (props.draft) {
    return { label: ACTION_LABEL, icon: EnvelopeIcon, disabled: true, title: UNPUBLISHED_TITLE };
  }

  const addressIsValid = isValidEmail(sendTo);

  function open() {
    setEmailType(defaultEmailType(document ?? {}));
    setSendTo(document?.email ?? "");
    setIsOpen(true);
  }

  async function requestResend() {
    setIsPending(true);
    try {
      await client
        .patch(props.id)
        .set({
          emailResendRequest: {
            emailType,
            correctedEmail: sendTo.trim(),
            requestedAt: new Date().toISOString(),
          },
        })
        .commit();
      toast.push({ status: "info", title: REQUESTED_TOAST });
      setIsOpen(false);
      props.onComplete();
    } catch (error) {
      toast.push({
        status: "error",
        title: error instanceof Error ? error.message : String(error),
      });
    } finally {
      setIsPending(false);
    }
  }

  return {
    label: ACTION_LABEL,
    icon: EnvelopeIcon,
    onHandle: open,
    dialog: isOpen && {
      type: "dialog",
      header: DIALOG_HEADER,
      onClose: isPending ? () => undefined : () => setIsOpen(false),
      content: (
        <Stack space={4}>
          <Text size={1}>{DIALOG_INTRO}</Text>
          <Stack space={2}>
            <Text size={1} weight="semibold">{EMAIL_TYPE_LABEL}</Text>
            <Select
              value={emailType}
              onChange={(event) => setEmailType(asCustomerEmailType(event.currentTarget.value) ?? "order_confirmation")}
              disabled={isPending}
            >
              {Object.entries(EMAIL_TYPE_LABELS).map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </Select>
          </Stack>
          <Stack space={2}>
            <Text size={1} weight="semibold">{SEND_TO_LABEL}</Text>
            <TextInput
              type="email"
              value={sendTo}
              onChange={(event) => setSendTo(event.currentTarget.value)}
              disabled={isPending}
            />
            {!addressIsValid && (
              <Box>
                <Text size={1} muted>{INVALID_ADDRESS}</Text>
              </Box>
            )}
          </Stack>
        </Stack>
      ),
      footer: (
        <Button
          text={SUBMIT_LABEL}
          tone="primary"
          disabled={isPending || !addressIsValid}
          onClick={() => void requestResend()}
        />
      ),
    },
  };
};
