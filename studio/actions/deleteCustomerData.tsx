import { TrashIcon } from "@sanity/icons";
import { Box, Button, Stack, Text, TextInput, useToast } from "@sanity/ui";
import { useCallback, useEffect, useState } from "react";
import type { DocumentActionComponent, DocumentActionProps } from "sanity";

/**
 * GDPR Art. 17 cascade delete trigger. Registered for the `submission` doc
 * type. Two-step typed-DELETE confirmation per Phase 4 PRD ISC-22 + ISC-A6
 * (no `window.confirm` / native dialog). UI strings reflect the locked
 * customer-facing wording — Stripe REDACTS personally identifying fields;
 * the transaction record itself is retained per HMRC 6-year obligation.
 *
 * The action POSTs `{ submissionId }` to the Next.js admin route. The
 * Studio bundle does NOT carry the `ADMIN_API_KEY` — the user pastes it
 * into the dialog so a leaked Studio bundle alone cannot trigger cascades.
 */

const CONFIRMATION_PHRASE = "DELETE";
const ADMIN_ROUTE = "/api/admin/delete-user";

type CascadeResponse = {
  userId: string;
  submissionIds: string[];
  partialFailures: string[];
  stripeRedactionJobId: string | null;
  brevoSmtpProcessId: string | null;
  mixpanelTaskId: string | null;
};

export const deleteCustomerDataAction: DocumentActionComponent = (props: DocumentActionProps) => {
  const toast = useToast();
  const [isOpen, setIsOpen] = useState(false);
  const [confirmText, setConfirmText] = useState("");
  const [adminToken, setAdminToken] = useState("");
  const [isPending, setIsPending] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      setConfirmText("");
      setAdminToken("");
    }
  }, [isOpen]);

  const submissionId = props.id;
  const handleConfirm = useCallback(async () => {
    if (confirmText !== CONFIRMATION_PHRASE) return;
    if (!adminToken) return;
    setIsPending(true);

    try {
      const response = await fetch(ADMIN_ROUTE, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Admin-Token": adminToken,
        },
        body: JSON.stringify({ submissionId }),
      });

      if (!response.ok) {
        const detail = await response.text().catch(() => "");
        toast.push({
          status: "error",
          title: "Cascade delete failed",
          description: `HTTP ${response.status}${detail ? ` — ${detail.slice(0, 120)}` : ""}`,
        });
        setIsPending(false);
        return;
      }

      const result = (await response.json()) as CascadeResponse;
      const summary =
        result.partialFailures.length > 0
          ? `Removed ${result.submissionIds.length} submission(s) with ${result.partialFailures.length} partial failure(s). Check the deletion_log.`
          : `Removed ${result.submissionIds.length} submission(s). Stripe redaction submitted; completes asynchronously within 30 days.`;
      toast.push({
        status: result.partialFailures.length > 0 ? "warning" : "success",
        title: "Customer data cascade complete",
        description: summary,
      });
      setIsOpen(false);
      setIsPending(false);
      props.onComplete();
    } catch (error) {
      toast.push({
        status: "error",
        title: "Cascade delete failed",
        description: error instanceof Error ? error.message : String(error),
      });
      setIsPending(false);
    }
  }, [adminToken, confirmText, props, submissionId, toast]);

  const isReadyToFire = confirmText === CONFIRMATION_PHRASE && adminToken.length > 0 && !isPending;

  return {
    label: "Delete customer data",
    tone: "critical",
    icon: TrashIcon,
    onHandle: () => setIsOpen(true),
    dialog: isOpen && {
      type: "dialog",
      header: "Delete customer data",
      // Sanity requires a non-undefined onClose; while pending we no-op so
      // the user can't close mid-cascade (Stripe Redaction is irreversible
      // once submitted).
      onClose: isPending ? () => undefined : () => setIsOpen(false),
      content: (
        <Stack space={4}>
          <Text size={1}>
            This will permanently delete the customer&apos;s reading content, photo,
            voice note, PDF, and account on our active systems. It will submit a
            Stripe redaction job (completes asynchronously within 30 days) and
            request deletion at Brevo and Mixpanel.
          </Text>
          <Text size={1}>
            <strong>The customer&apos;s transactional record (name, email, amount,
            date, country)</strong> is retained for 6 years per UK HMRC requirements.
            Stripe redacts the personally identifying fields; the transaction record
            itself is retained as legally required.
          </Text>
          <Box>
            <Text size={1} weight="semibold">
              Type {CONFIRMATION_PHRASE} to confirm:
            </Text>
            <Box marginTop={2}>
              <TextInput
                value={confirmText}
                onChange={(e) => setConfirmText(e.currentTarget.value)}
                disabled={isPending}
                placeholder={CONFIRMATION_PHRASE}
              />
            </Box>
          </Box>
          <Box>
            <Text size={1} weight="semibold">
              Admin token:
            </Text>
            <Box marginTop={2}>
              <TextInput
                type="password"
                value={adminToken}
                onChange={(e) => setAdminToken(e.currentTarget.value)}
                disabled={isPending}
                placeholder="Paste the admin token"
              />
            </Box>
          </Box>
        </Stack>
      ),
      footer: (
        <Stack space={2}>
          <Button
            text={isPending ? "Deleting..." : "Run cascade delete"}
            tone="critical"
            disabled={!isReadyToFire}
            onClick={handleConfirm}
          />
        </Stack>
      ),
    },
  };
};
