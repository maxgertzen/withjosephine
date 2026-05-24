import { Card, Flex, Stack, Text } from "@sanity/ui";
import { useEffect, useState } from "react";
import type { SanityDocument } from "sanity";

import {
  isPreviewTemplateKey,
  renderEmailPreview,
} from "@/lib/emails/render-preview";

type DocumentSlot = SanityDocument | null;

type EmailPreviewProps = {
  document?: {
    displayed?: DocumentSlot;
    draft?: DocumentSlot;
    published?: DocumentSlot;
  };
};

export function EmailPreview(props: EmailPreviewProps) {
  const displayed = props.document?.displayed ?? null;
  const [html, setHtml] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!displayed || !isPreviewTemplateKey(displayed._type)) {
      setHtml(null);
      return;
    }
    let cancelled = false;
    renderEmailPreview(displayed._type, displayed)
      .then((rendered) => {
        if (!cancelled) {
          setHtml(rendered);
          setError(null);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : String(err));
          setHtml(null);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [displayed]);

  if (!displayed || !displayed._type) {
    return (
      <Flex padding={4} align="center" justify="center" style={{ height: "100%" }}>
        <Card padding={4} radius={2} tone="transparent" border>
          <Stack space={3}>
            <Text size={2} weight="semibold">
              Save the document to see a live preview
            </Text>
            <Text size={1} muted>
              Once this email has at least one saved revision (draft or published), the
              preview iframe will render the email exactly as the customer receives it.
            </Text>
          </Stack>
        </Card>
      </Flex>
    );
  }

  if (!isPreviewTemplateKey(displayed._type)) {
    return (
      <Flex padding={4} align="center" justify="center" style={{ height: "100%" }}>
        <Card padding={4} radius={2} tone="caution" border>
          <Text size={1}>No preview available for type "{displayed._type}".</Text>
        </Card>
      </Flex>
    );
  }

  if (error) {
    return (
      <Flex padding={4} align="center" justify="center" style={{ height: "100%" }}>
        <Card padding={4} radius={2} tone="critical" border>
          <Stack space={2}>
            <Text size={2} weight="semibold">
              Preview failed to render
            </Text>
            <Text size={1} muted>
              {error}
            </Text>
          </Stack>
        </Card>
      </Flex>
    );
  }

  return (
    <iframe
      srcDoc={html ?? ""}
      title={`Email preview — ${displayed._type}`}
      sandbox=""
      style={{ width: "100%", height: "100%", border: "none", background: "#FAF8F4" }}
    />
  );
}
