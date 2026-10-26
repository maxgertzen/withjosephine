import { TrashIcon } from "@sanity/icons";
import { Button, Spinner, Stack, Text, useToast } from "@sanity/ui";
import { getDraftId } from "@sanity/client/csm";
import { useCallback, useState } from "react";
import type { DocumentActionComponent } from "sanity";

import { usePerspectiveClient } from "../lib/draftsClient";
import {
  planReadingDeletion,
  READING_REFERRERS_QUERY,
  READING_RELEASE_VERSIONS_QUERY,
  releaseVersionsPath,
  type ReadingDeletionPlan,
  type ReadingReferrer,
} from "../lib/readingDeletion";

type ReadingFields = { name?: string; subtitle?: string };

export const deleteReadingAction: DocumentActionComponent = (props) => {
  const toast = useToast();
  const client = usePerspectiveClient("raw");
  const [plan, setPlan] = useState<ReadingDeletionPlan | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [isPending, setIsPending] = useState(false);
  const readingId = props.id;
  const fields = (props.published ?? props.draft ?? {}) as ReadingFields;
  const name = fields.name ?? "this reading";

  const open = useCallback(async () => {
    setIsOpen(true);
    setPlan(null);
    try {
      const [referrers, releaseVersions] = await Promise.all([
        client.fetch<ReadingReferrer[]>(READING_REFERRERS_QUERY, { id: readingId }),
        client.fetch<number>(READING_RELEASE_VERSIONS_QUERY, { versionsPath: releaseVersionsPath(readingId) }),
      ]);
      setPlan(planReadingDeletion(readingId, fields.subtitle || name, referrers, releaseVersions));
    } catch (error) {
      setIsOpen(false);
      toast.push({
        status: "error",
        title: "Could not check what links to this reading",
        description: error instanceof Error ? error.message : String(error),
      });
    }
  }, [client, fields.subtitle, name, readingId, toast]);

  const canDelete = plan !== null && plan.blocked.length === 0 && !isPending;

  const confirm = useCallback(async () => {
    if (!plan || !canDelete) return;
    setIsPending(true);
    try {
      const transaction = client.transaction();
      for (const { id, set, unset } of plan.patches) transaction.patch(id, { set, unset });
      transaction.delete(getDraftId(readingId)).delete(readingId);
      await transaction.commit();
      toast.push({ status: "success", title: `${name} deleted` });
      setIsOpen(false);
      props.onComplete();
    } catch (error) {
      toast.push({
        status: "error",
        title: "The reading could not be deleted",
        description: error instanceof Error ? error.message : String(error),
      });
    } finally {
      setIsPending(false);
    }
  }, [canDelete, client, name, plan, props, readingId, toast]);

  return {
    label: "Delete",
    tone: "critical",
    icon: TrashIcon,
    onHandle: open,
    dialog: isOpen && {
      type: "dialog",
      header: `Delete ${name}`,
      onClose: isPending ? () => undefined : () => setIsOpen(false),
      content:
        plan === null ? (
          <Spinner muted />
        ) : (
          <Stack space={3}>
            {plan.blocked.length > 0 ? (
              <>
                <Text size={1}>This reading cannot be deleted:</Text>
                {plan.blocked.map((reason) => (
                  <Text key={reason} size={1}>
                    {reason}
                  </Text>
                ))}
                <Text size={1}>To take it off the site, turn off Show on the site under Setup.</Text>
              </>
            ) : (
              <>
                <Text size={1}>The reading is deleted for good.</Text>
                {plan.summary.map((line) => (
                  <Text key={line} size={1}>
                    {line}
                  </Text>
                ))}
              </>
            )}
          </Stack>
        ),
      footer: (
        <Button
          text={isPending ? "Deleting..." : "Delete reading"}
          tone="critical"
          disabled={!canDelete}
          onClick={confirm}
        />
      ),
    },
  };
};
