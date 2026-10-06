import { Box, Button, Dialog, Select, Stack, Text, TextInput } from "@sanity/ui";
import { useState } from "react";

import { asCustomerEmailType } from "../../../src/lib/booking/emailFiredType";
import { isValidEmail } from "../../../src/lib/formStyles";
import type { CustomerEmailType } from "../../../src/lib/page-previews/types";
import { EMAIL_TYPE_LABELS } from "../../schemas/emailFailurePreview";

const HEADER = "Resend customer email";
const INTRO =
  "Sends the email again. If the address was wrong, type the right one: it replaces the address on the order and for future sign-in links. Up to 3 resends per email in 24 hours.";
const EMAIL_TYPE_LABEL = "Email to resend";
const SEND_TO_LABEL = "Send to";
const INVALID_ADDRESS = "This is not a valid email address.";
const SUBMIT_LABEL = "Resend";

export function ResendEmailDialog(props: {
  id: string;
  emailTypes: CustomerEmailType[];
  initialEmailType: CustomerEmailType;
  initialSendTo: string;
  isPending: boolean;
  onClose: () => void;
  onSubmit: (request: { emailType: CustomerEmailType; sendTo: string }) => void;
}) {
  const [emailType, setEmailType] = useState<CustomerEmailType>(props.initialEmailType);
  const [sendTo, setSendTo] = useState(props.initialSendTo);
  const addressIsValid = isValidEmail(sendTo);

  return (
    <Dialog
      id={props.id}
      header={HEADER}
      onClose={props.isPending ? undefined : props.onClose}
      width={1}
      footer={
        <Box padding={3}>
          <Button
            text={SUBMIT_LABEL}
            tone="primary"
            width="fill"
            disabled={props.isPending || !addressIsValid}
            onClick={() => props.onSubmit({ emailType, sendTo })}
          />
        </Box>
      }
    >
      <Box padding={4}>
        <Stack space={4}>
          <Text size={1}>{INTRO}</Text>
          <Stack space={2}>
            <Text size={1} weight="semibold">
              {EMAIL_TYPE_LABEL}
            </Text>
            <Select
              value={emailType}
              onChange={(event) =>
                setEmailType(asCustomerEmailType(event.currentTarget.value) ?? emailType)
              }
              disabled={props.isPending}
            >
              {props.emailTypes.map((type) => (
                <option key={type} value={type}>
                  {EMAIL_TYPE_LABELS[type]}
                </option>
              ))}
            </Select>
          </Stack>
          <Stack space={2}>
            <Text size={1} weight="semibold">
              {SEND_TO_LABEL}
            </Text>
            <TextInput
              type="email"
              value={sendTo}
              onChange={(event) => setSendTo(event.currentTarget.value)}
              disabled={props.isPending}
            />
            {!addressIsValid && (
              <Text size={1} muted>
                {INVALID_ADDRESS}
              </Text>
            )}
          </Stack>
        </Stack>
      </Box>
    </Dialog>
  );
}
