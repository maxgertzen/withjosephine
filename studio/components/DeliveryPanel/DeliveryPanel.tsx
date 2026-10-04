import { EnvelopeIcon } from "@sanity/icons";
import { Box, Button, Card, Dialog, Flex, Stack, Text, useToast } from "@sanity/ui";
import { useState } from "react";
import { getPublishedId, type StringInputProps, useClient, useEditState, useFormValue } from "sanity";

import type { CustomerEmailType } from "../../../src/lib/page-previews/types";
import {
  REQUESTED_TOAST,
  requestDelivery,
  requestResend,
  STUDIO_API_VERSION,
} from "../../lib/studioRequests";
import { type DeliveryPanelDocument, deliveryPanelModel } from "./deliveryPanelModel";
import { ResendEmailDialog } from "./ResendEmailDialog";

const SEND_LABEL = "Send reading now";
const TRY_AGAIN_LABEL = "Try again";
const CONFIRM_LABEL = "Send";
const FAILED_SENDS_HEADING = "Failed sends";
const RESEND_LABEL = "Resend";
const RESEND_ANY_LABEL = "Resend an email…";

export function DeliveryPanel(props: StringInputProps) {
  const documentId = useFormValue(["_id"]) as string | undefined;
  const publishedId = getPublishedId(documentId ?? "");
  const editState = useEditState(publishedId, "submission");
  const client = useClient({ apiVersion: STUDIO_API_VERSION });
  const toast = useToast();
  const [isPending, setIsPending] = useState(false);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [resendType, setResendType] = useState<CustomerEmailType | null>(null);

  const published = editState.published as DeliveryPanelDocument | null;
  if (!published) return null;
  const model = deliveryPanelModel({ published, draft: editState.draft });
  const resendDisabled = isPending || model.resendLine !== null;

  async function run(request: () => Promise<void>) {
    setIsPending(true);
    try {
      await request();
      toast.push({ status: "info", title: REQUESTED_TOAST });
      setIsConfirmOpen(false);
      setResendType(null);
    } catch (error) {
      toast.push({ status: "error", title: error instanceof Error ? error.message : String(error) });
    } finally {
      setIsPending(false);
    }
  }

  const sendDelivery = () => run(() => requestDelivery(client, publishedId));

  return (
    <Stack space={3} id={props.id}>
      <Card
        padding={3}
        radius={2}
        border
        tone={model.button?.kind === "tryAgain" ? "critical" : "default"}
      >
        <Flex align="center" gap={3} wrap="wrap">
          <Box flex={1}>
            <Text size={1}>{model.statusLine}</Text>
          </Box>
          {model.button && (
            <Button
              icon={EnvelopeIcon}
              text={model.button.kind === "tryAgain" ? TRY_AGAIN_LABEL : SEND_LABEL}
              tone="primary"
              disabled={isPending || !model.button.enabled}
              onClick={() =>
                model.button?.kind === "tryAgain" ? void sendDelivery() : setIsConfirmOpen(true)
              }
            />
          )}
        </Flex>
      </Card>

      {model.failedSends.length > 0 && (
        <Card padding={3} radius={2} border tone="critical">
          <Stack space={3}>
            <Text size={1} weight="semibold">
              {FAILED_SENDS_HEADING}
            </Text>
            {model.failedSends.map((failure) => (
              <Flex key={failure.key} align="center" gap={3} wrap="wrap">
                <Stack space={2} flex={1}>
                  <Text size={1}>{failure.title}</Text>
                  <Text size={1} muted>
                    {failure.subtitle}
                  </Text>
                </Stack>
                <Button
                  text={RESEND_LABEL}
                  mode="ghost"
                  disabled={resendDisabled || !model.resendTypes.includes(failure.emailType)}
                  onClick={() => setResendType(failure.emailType)}
                />
              </Flex>
            ))}
          </Stack>
        </Card>
      )}

      <Flex align="center" gap={3} wrap="wrap">
        <Button
          text={RESEND_ANY_LABEL}
          mode="ghost"
          disabled={resendDisabled}
          onClick={() => setResendType(model.defaultResendType)}
        />
        {model.resendLine && (
          <Text size={1} muted>
            {model.resendLine}
          </Text>
        )}
      </Flex>

      {isConfirmOpen && (
        <Dialog
          id={`${props.id}-confirm`}
          header={SEND_LABEL}
          onClose={isPending ? undefined : () => setIsConfirmOpen(false)}
          width={1}
          footer={
            <Box padding={3}>
              <Button
                text={CONFIRM_LABEL}
                tone="primary"
                width="fill"
                disabled={isPending || model.button?.kind !== "send" || !model.button.enabled}
                onClick={() => void sendDelivery()}
              />
            </Box>
          }
        >
          <Box padding={4}>
            <Text size={1}>{model.statusLine}</Text>
          </Box>
        </Dialog>
      )}

      {resendType && (
        <ResendEmailDialog
          id={`${props.id}-resend`}
          emailTypes={model.resendTypes}
          initialEmailType={resendType}
          initialSendTo={published.email ?? ""}
          isPending={isPending}
          onClose={() => setResendType(null)}
          onSubmit={(request) => void run(() => requestResend(client, publishedId, request))}
        />
      )}
    </Stack>
  );
}
