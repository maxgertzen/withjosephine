import { EnvelopeIcon } from "@sanity/icons";
import { Box, Button, Select, Stack, Text, useToast } from "@sanity/ui";
import { useCallback, useEffect, useState } from "react";
import type { DocumentActionComponent, DocumentActionProps } from "sanity";

import { AdminTokenInput } from "../components/AdminTokenInput";

const LIST_ROUTE = "/api/admin/list-preview-recipients";
const SEND_ROUTE = "/api/admin/send-email-preview";

export const sendEmailPreviewAction: DocumentActionComponent = (
  props: DocumentActionProps,
) => {
  const toast = useToast();
  const [isOpen, setIsOpen] = useState(false);
  const [adminToken, setAdminToken] = useState("");
  const [recipients, setRecipients] = useState<readonly string[]>([]);
  const [recipient, setRecipient] = useState<string>("");
  const [isPending, setIsPending] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) {
      setAdminToken("");
      setRecipients([]);
      setRecipient("");
      setLoadError(null);
    }
  }, [isOpen]);

  const loadRecipients = useCallback(async () => {
    if (!adminToken) return;
    setLoadError(null);
    try {
      const response = await fetch(LIST_ROUTE, {
        method: "GET",
        headers: { "X-Admin-Token": adminToken },
      });
      if (response.status === 503) {
        setLoadError(
          "Send-to-test is not configured on this environment (ALLOWED_PREVIEW_RECIPIENTS unset).",
        );
        return;
      }
      if (!response.ok) {
        setLoadError(`HTTP ${response.status}, check the admin token.`);
        return;
      }
      const data = (await response.json()) as { recipients?: string[] };
      const list = data.recipients ?? [];
      setRecipients(list);
      setRecipient(list[0] ?? "");
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : String(error));
    }
  }, [adminToken]);

  const handleSend = useCallback(async () => {
    if (!adminToken || !recipient) return;
    setIsPending(true);
    try {
      const response = await fetch(SEND_ROUTE, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Admin-Token": adminToken,
        },
        body: JSON.stringify({ template: props.type, recipient }),
      });
      if (!response.ok) {
        const detail = await response.text().catch(() => "");
        toast.push({
          status: "error",
          title: "Preview send failed",
          description: `HTTP ${response.status}${detail ? `: ${detail.slice(0, 200)}` : ""}`,
        });
        setIsPending(false);
        return;
      }
      toast.push({
        status: "success",
        title: "Preview sent",
        description: `Test render delivered to ${recipient}.`,
      });
      setIsOpen(false);
      setIsPending(false);
      props.onComplete();
    } catch (error) {
      toast.push({
        status: "error",
        title: "Preview send failed",
        description: error instanceof Error ? error.message : String(error),
      });
      setIsPending(false);
    }
  }, [adminToken, props, recipient, toast]);

  const hasUnpublishedChanges = Boolean(props.draft && props.draft._rev !== props.published?._rev);
  const canSend = Boolean(adminToken && recipient && !isPending);

  return {
    label: hasUnpublishedChanges
      ? "Send preview… (publish first)"
      : "Send preview to inbox…",
    icon: EnvelopeIcon,
    disabled: hasUnpublishedChanges,
    onHandle: () => setIsOpen(true),
    dialog: isOpen && {
      type: "dialog",
      header: "Send preview to inbox",
      onClose: isPending ? () => undefined : () => setIsOpen(false),
      content: (
        <Stack space={4}>
          <Text size={1}>
            Sends the currently published copy to a pre-approved inbox so you
            can verify cross-client rendering. Recipients are configured via
            the ALLOWED_PREVIEW_RECIPIENTS Worker env var; only those addresses
            can receive previews.
          </Text>
          <AdminTokenInput
            value={adminToken}
            onChange={setAdminToken}
            onBlur={loadRecipients}
            disabled={isPending}
          />
          {loadError ? (
            <Text size={1} muted>
              {loadError}
            </Text>
          ) : null}
          {recipients.length > 0 ? (
            <Box>
              <Text size={1} weight="semibold">
                Recipient:
              </Text>
              <Box marginTop={2}>
                <Select
                  value={recipient}
                  onChange={(e) => setRecipient(e.currentTarget.value)}
                  disabled={isPending}
                >
                  {recipients.map((address) => (
                    <option key={address} value={address}>
                      {address}
                    </option>
                  ))}
                </Select>
              </Box>
            </Box>
          ) : null}
        </Stack>
      ),
      footer: (
        <Stack space={2}>
          <Button
            text={isPending ? "Sending…" : "Send preview"}
            tone="primary"
            disabled={!canSend}
            onClick={handleSend}
          />
        </Stack>
      ),
    },
  };
};
