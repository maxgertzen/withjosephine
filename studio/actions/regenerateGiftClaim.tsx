import { RefreshIcon } from "@sanity/icons";
import { Box, Button, Stack, Text, TextInput, useToast } from "@sanity/ui";
import { useCallback, useEffect, useState } from "react";
import type { DocumentActionComponent, DocumentActionProps } from "sanity";

const ADMIN_ROUTE = "/api/admin/regenerate-gift-claim";

type SubmissionDoc = {
  isGift?: boolean;
  giftClaimedAt?: string | null;
  giftCancelledAt?: string | null;
};

export const regenerateGiftClaimAction: DocumentActionComponent = (props: DocumentActionProps) => {
  const toast = useToast();
  const [isOpen, setIsOpen] = useState(false);
  const [adminToken, setAdminToken] = useState("");
  const [isPending, setIsPending] = useState(false);

  useEffect(() => {
    if (!isOpen) setAdminToken("");
  }, [isOpen]);

  const doc = (props.published ?? props.draft) as SubmissionDoc | null;
  if (!isVisibleForDocument(doc)) return null;

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
        body: JSON.stringify({ submissionId }),
      });

      if (!response.ok) {
        const detail = await response.text().catch(() => "");
        toast.push({
          status: "error",
          title: "Regenerate gift link failed",
          description: `HTTP ${response.status}${detail ? ` — ${detail.slice(0, 160)}` : ""}`,
        });
        setIsPending(false);
        return;
      }

      const result = (await response.json()) as {
        outcome: string;
        to?: string;
        deliveryMethod?: string;
        reason?: string;
      };
      if (result.outcome === "regenerated") {
        toast.push({
          status: "success",
          title: "New gift link sent",
          description: `Sent to ${result.to ?? "the right party"} (${result.deliveryMethod ?? "gift"}). The previous link is now invalid.`,
        });
      } else {
        toast.push({
          status: "warning",
          title: "Regenerate refused",
          description: `Reason: ${result.reason ?? "unknown"}.`,
        });
      }
      setIsOpen(false);
      setIsPending(false);
      props.onComplete();
    } catch (error) {
      toast.push({
        status: "error",
        title: "Regenerate gift link failed",
        description: error instanceof Error ? error.message : String(error),
      });
      setIsPending(false);
    }
  }, [adminToken, props, submissionId, toast]);

  const isReadyToFire = adminToken.length > 0 && !isPending;

  return {
    label: "Regenerate gift claim link",
    icon: RefreshIcon,
    onHandle: () => setIsOpen(true),
    dialog: isOpen && {
      type: "dialog",
      header: "Regenerate gift claim link",
      onClose: isPending ? () => undefined : () => setIsOpen(false),
      content: (
        <Stack space={4}>
          <Text size={1}>
            This emails a <strong>new claim link</strong> to the right party and
            invalidates the previous link. Use this when a customer writes in saying
            they lost their gift link.
          </Text>
          <Text size={1}>
            For <em>self-send</em> gifts the link goes to the purchaser; for{" "}
            <em>scheduled</em> gifts it goes to the recipient.
          </Text>
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
            text={isPending ? "Sending..." : "Regenerate and send"}
            tone="primary"
            disabled={!isReadyToFire}
            onClick={handleConfirm}
          />
        </Stack>
      ),
    },
  };
};

export function isVisibleForDocument(doc: SubmissionDoc | null): boolean {
  if (!doc) return false;
  if (doc.isGift !== true) return false;
  if (doc.giftClaimedAt) return false;
  if (doc.giftCancelledAt) return false;
  return true;
}
