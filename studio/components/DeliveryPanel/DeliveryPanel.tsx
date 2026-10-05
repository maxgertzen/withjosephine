import { EnvelopeIcon } from "@sanity/icons";
import { Box, Button, Card, Dialog, Flex, Stack, Text, useToast } from "@sanity/ui";
import { useState } from "react";
import {
  getPublishedId,
  type StringInputProps,
  useClient,
  useDataset,
  useEditState,
  useFormValue,
} from "sanity";

import type { GiftEmailFiredType } from "../../../src/lib/gift/types";
import type { CustomerEmailType } from "../../../src/lib/page-previews/types";
import {
  QUEUED_TOAST,
  REQUESTED_TOAST,
  requestDelivery,
  requestResend,
  STUDIO_API_VERSION,
} from "../../lib/studioRequests";
import { workerOriginFor } from "../../lib/siteOrigins";
import {
  type DeliveryPanelDocument,
  deliveryPanelModel,
  GIFT_RESEND_COPY,
} from "./deliveryPanelModel";
import { ResendEmailDialog } from "./ResendEmailDialog";

const SEND_LABEL = "Send reading now";
const TRY_AGAIN_LABEL = "Try again";
const CONFIRM_LABEL = "Send";
const FAILED_SENDS_HEADING = "Failed sends";
const GIFT_FAILED_SENDS_HEADING = "Failed gift emails";
const RESEND_LABEL = "Resend";
const RESEND_ANY_LABEL = "Resend an email…";

type FailedSendRowView = { key: string; title: string; subtitle: string };

type RowAction = { label: string; disabled: boolean; onClick: () => void } | null;

function FailedSendsCard<TRow extends FailedSendRowView>({
  heading,
  rows,
  action,
  note = null,
}: {
  heading: string;
  rows: readonly TRow[];
  action: (row: TRow) => RowAction;
  note?: string | null;
}) {
  if (rows.length === 0) return null;
  return (
    <Card padding={3} radius={2} border tone="critical">
      <Stack space={3}>
        <Text size={1} weight="semibold">
          {heading}
        </Text>
        {rows.map((row) => {
          const rowAction = action(row);
          return (
            <Flex key={row.key} align="center" gap={3} wrap="wrap">
              <Stack space={2} flex={1}>
                <Text size={1}>{row.title}</Text>
                <Text size={1} muted>
                  {row.subtitle}
                </Text>
              </Stack>
              {rowAction && (
                <Button
                  text={rowAction.label}
                  mode="ghost"
                  disabled={rowAction.disabled}
                  onClick={rowAction.onClick}
                />
              )}
            </Flex>
          );
        })}
        {note && (
          <Text size={1} muted>
            {note}
          </Text>
        )}
      </Stack>
    </Card>
  );
}

function ConfirmDialog({
  id,
  header,
  line,
  isPending,
  confirmDisabled,
  onClose,
  onConfirm,
}: {
  id: string;
  header: string;
  line: string;
  isPending: boolean;
  confirmDisabled: boolean;
  onClose: () => void;
  onConfirm: () => void;
}) {
  return (
    <Dialog
      id={id}
      header={header}
      onClose={isPending ? undefined : onClose}
      width={1}
      footer={
        <Box padding={3}>
          <Button
            text={CONFIRM_LABEL}
            tone="primary"
            width="fill"
            disabled={confirmDisabled}
            onClick={onConfirm}
          />
        </Box>
      }
    >
      <Box padding={4}>
        <Text size={1}>{line}</Text>
      </Box>
    </Dialog>
  );
}

export function DeliveryPanel(props: StringInputProps) {
  const documentId = useFormValue(["_id"]) as string | undefined;
  const publishedId = getPublishedId(documentId ?? "");
  const editState = useEditState(publishedId, "submission");
  const client = useClient({ apiVersion: STUDIO_API_VERSION });
  const dataset = useDataset();
  const toast = useToast();
  const [isPending, setIsPending] = useState(false);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [resendType, setResendType] = useState<CustomerEmailType | null>(null);
  const [giftResendType, setGiftResendType] = useState<GiftEmailFiredType | null>(null);

  const published = editState.published as DeliveryPanelDocument | null;
  if (!published) return null;
  const model = deliveryPanelModel({ published, draft: editState.draft });
  const resendDisabled = isPending || model.resendLine !== null;

  const workerOrigin = workerOriginFor(dataset, window.location.origin);

  async function run(request: () => Promise<boolean>) {
    setIsPending(true);
    try {
      const woke = await request();
      toast.push({ status: "info", title: woke ? REQUESTED_TOAST : QUEUED_TOAST });
      setIsConfirmOpen(false);
      setResendType(null);
      setGiftResendType(null);
    } catch (error) {
      toast.push({ status: "error", title: error instanceof Error ? error.message : String(error) });
    } finally {
      setIsPending(false);
    }
  }

  const sendDelivery = () => run(() => requestDelivery(client, publishedId, workerOrigin));

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

      <FailedSendsCard
        heading={FAILED_SENDS_HEADING}
        rows={model.failedSends}
        action={(failure) => ({
          label: RESEND_LABEL,
          disabled: resendDisabled || !model.resendTypes.includes(failure.emailType),
          onClick: () => setResendType(failure.emailType),
        })}
      />

      <FailedSendsCard
        heading={GIFT_FAILED_SENDS_HEADING}
        rows={model.giftFailedSends}
        action={(failure) =>
          failure.resendable
            ? {
                label: GIFT_RESEND_COPY[failure.emailType].label,
                disabled: resendDisabled,
                onClick: () => setGiftResendType(failure.emailType),
              }
            : null
        }
        note={model.resendTypes.length === 0 ? model.resendLine : null}
      />

      {model.resendTypes.length > 0 && (
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
      )}

      {isConfirmOpen && (
        <ConfirmDialog
          id={`${props.id}-confirm`}
          header={SEND_LABEL}
          line={model.statusLine}
          isPending={isPending}
          confirmDisabled={isPending || model.button?.kind !== "send" || !model.button.enabled}
          onClose={() => setIsConfirmOpen(false)}
          onConfirm={() => void sendDelivery()}
        />
      )}

      {giftResendType && (
        <ConfirmDialog
          id={`${props.id}-gift-resend`}
          header={GIFT_RESEND_COPY[giftResendType].label}
          line={GIFT_RESEND_COPY[giftResendType].confirmLine}
          isPending={isPending}
          confirmDisabled={resendDisabled}
          onClose={() => setGiftResendType(null)}
          onConfirm={() =>
            void run(() =>
              requestResend(client, publishedId, { emailType: giftResendType }, workerOrigin),
            )
          }
        />
      )}

      {resendType && (
        <ResendEmailDialog
          id={`${props.id}-resend`}
          emailTypes={model.resendTypes}
          initialEmailType={resendType}
          initialSendTo={published.email ?? ""}
          isPending={isPending}
          onClose={() => setResendType(null)}
          onSubmit={(request) => void run(() => requestResend(client, publishedId, request, workerOrigin))}
        />
      )}
    </Stack>
  );
}
