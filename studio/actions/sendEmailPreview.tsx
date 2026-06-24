import { EnvelopeIcon } from "@sanity/icons";
import { Box, Button, Select, Stack, Text, useToast } from "@sanity/ui";
import { useCallback, useEffect, useState } from "react";
import type { DocumentActionComponent, DocumentActionProps } from "sanity";

const LIST_ROUTE = "/api/admin/list-preview-recipients";
const SEND_ROUTE = "/api/admin/send-email-preview";

export const sendEmailPreviewAction: DocumentActionComponent = (
  props: DocumentActionProps,
) => {
  const toast = useToast();
  const [isOpen, setIsOpen] = useState(false);
  const [recipients, setRecipients] = useState<readonly string[]>([]);
  const [recipient, setRecipient] = useState<string>("");
  const [isPending, setIsPending] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  const loadRecipients = useCallback(async () => {
    setLoadError(null);
    try {
      const response = await fetch(LIST_ROUTE, { method: "GET" });
      if (response.status === 503) {
        setLoadError(
          "Send-to-test is not configured on this environment (ALLOWED_PREVIEW_RECIPIENTS unset).",
        );
        return;
      }
      if (!response.ok) {
        setLoadError(`HTTP ${response.status}, could not load recipients.`);
        return;
      }
      const data = (await response.json()) as { recipients?: string[] };
      const list = data.recipients ?? [];
      setRecipients(list);
      setRecipient(list[0] ?? "");
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : String(error));
    }
  }, []);

  // The allowlist is the boundary now (no admin token), so the dropdown loads
  // as soon as the dialog opens instead of waiting on a token blur.
  useEffect(() => {
    if (!isOpen) {
      setRecipients([]);
      setRecipient("");
      setLoadError(null);
      return;
    }
    void loadRecipients();
  }, [isOpen, loadRecipients]);

  const handleSend = useCallback(async () => {
    if (!recipient) return;
    setIsPending(true);
    try {
      const response = await fetch(SEND_ROUTE, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
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
  }, [props, recipient, toast]);

  const hasUnpublishedChanges = Boolean(props.draft && props.draft._rev !== props.published?._rev);
  const canSend = Boolean(recipient && !isPending);

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
