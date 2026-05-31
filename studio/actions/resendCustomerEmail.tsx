import { EnvelopeIcon } from "@sanity/icons";
import { Box, Button, Select, Stack, Text, useToast } from "@sanity/ui";
import { useCallback, useEffect, useState } from "react";
import type { DocumentActionComponent, DocumentActionProps } from "sanity";

import { AdminTokenInput } from "../components/AdminTokenInput";

const ADMIN_ROUTE = "/api/admin/resend-customer-email";

const EMAIL_TYPES = [
  { value: "order_confirmation", label: "Order confirmation (booking receipt)" },
  { value: "day7", label: "Day +7 — Delivery email" },
] as const;

type SubmissionDoc = {
  status?: string;
};

export const resendCustomerEmailAction: DocumentActionComponent = (
  props: DocumentActionProps,
) => {
  const toast = useToast();
  const [isOpen, setIsOpen] = useState(false);
  const [adminToken, setAdminToken] = useState("");
  const [emailType, setEmailType] = useState<string>(EMAIL_TYPES[0].value);
  const [isPending, setIsPending] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      setAdminToken("");
      setEmailType(EMAIL_TYPES[0].value);
    }
  }, [isOpen]);

  const doc = (props.published ?? props.draft) as SubmissionDoc | null;
  if (!doc || doc.status !== "paid") return null;

  const submissionId = props.id;

  const handleConfirm = useCallback(async () => {
    if (!adminToken) return;
    setIsPending(true);
    try {
      const response = await fetch(ADMIN_ROUTE, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Admin-Token": adminToken,
        },
        body: JSON.stringify({ submissionId, emailType }),
      });

      if (!response.ok) {
        const detail = await response.text().catch(() => "");
        const parsed = detail
          ? (() => {
              try {
                return JSON.parse(detail) as { reason?: string };
              } catch {
                return null;
              }
            })()
          : null;
        toast.push({
          status: "error",
          title: "Resend failed",
          description: parsed?.reason
            ? `Reason: ${parsed.reason}.`
            : `HTTP ${response.status}${detail ? ` — ${detail.slice(0, 160)}` : ""}`,
        });
        setIsPending(false);
        return;
      }

      const result = (await response.json()) as {
        outcome: string;
        to?: string;
        emailType?: string;
      };
      toast.push({
        status: "success",
        title: "Email resent",
        description: `${result.emailType ?? emailType} sent to ${result.to ?? "the customer"}.`,
      });
      setIsOpen(false);
      setIsPending(false);
      props.onComplete();
    } catch (error) {
      toast.push({
        status: "error",
        title: "Resend failed",
        description: error instanceof Error ? error.message : String(error),
      });
      setIsPending(false);
    }
  }, [adminToken, emailType, props, submissionId, toast]);

  const isReadyToFire = adminToken.length > 0 && !isPending;

  return {
    label: "Resend customer email…",
    icon: EnvelopeIcon,
    onHandle: () => setIsOpen(true),
    dialog: isOpen && {
      type: "dialog",
      header: "Resend customer email",
      onClose: isPending ? () => undefined : () => setIsOpen(false),
      content: (
        <Stack space={4}>
          <Text size={1}>
            Use this when a customer writes in saying they didn&apos;t receive a
            transactional email. The resend is rate-limited to 3 per email type per
            24 hours and is recorded in the emailsFired audit log.
          </Text>
          <Box>
            <Text size={1} weight="semibold">Email to resend:</Text>
            <Box marginTop={2}>
              <Select
                value={emailType}
                onChange={(e) => setEmailType(e.currentTarget.value)}
                disabled={isPending}
              >
                {EMAIL_TYPES.map((option) => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </Select>
            </Box>
          </Box>
          <AdminTokenInput
            value={adminToken}
            onChange={setAdminToken}
            disabled={isPending}
          />
        </Stack>
      ),
      footer: (
        <Stack space={2}>
          <Button
            text={isPending ? "Sending…" : "Resend"}
            tone="primary"
            disabled={!isReadyToFire}
            onClick={handleConfirm}
          />
        </Stack>
      ),
    },
  };
};
