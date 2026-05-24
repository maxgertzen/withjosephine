import { Card, Flex, Stack, Text } from "@sanity/ui";
import type { CardTone } from "@sanity/ui";
import { useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
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

function CenteredCard({ tone, children }: { tone: CardTone; children: ReactNode }) {
  return (
    <Flex padding={4} align="center" justify="center" style={{ height: "100%" }}>
      <Card padding={4} radius={2} tone={tone} border>
        {children}
      </Card>
    </Flex>
  );
}

export function EmailPreview(props: EmailPreviewProps) {
  const displayed = props.document?.displayed ?? null;
  const [html, setHtml] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  // Track the latest `displayed` value via ref so a later parent re-render
  // (Sanity Studio churns the reference even when content is identical)
  // doesn't cancel a still-resolving render. The promise we care about is
  // the most-recent one — older ones noop on resolve via the seq guard.
  const latestSeq = useRef(0);

  useEffect(() => {
    if (!displayed || !isPreviewTemplateKey(displayed._type)) {
      setHtml(null);
      return;
    }
    const seq = ++latestSeq.current;
    renderEmailPreview(displayed._type, displayed)
      .then((rendered) => {
        if (seq !== latestSeq.current) return;
        setHtml(rendered);
        setError(null);
      })
      .catch((err) => {
        if (seq !== latestSeq.current) return;
        setError(err instanceof Error ? err.message : String(err));
        setHtml(null);
      });
    // Intentionally NO cleanup that flips a cancelled flag — Sanity Studio
    // passes a new `displayed` object reference on every parent re-render
    // (even when content hasn't changed), and a cleanup that cancels would
    // race the render promise to completion and leave `html` permanently
    // null. The `seq` guard above means only the latest fired render
    // commits state; older in-flight ones are no-ops on resolve.
  }, [displayed]);

  if (!displayed || !displayed._type) {
    return (
      <CenteredCard tone="transparent">
        <Stack space={3}>
          <Text size={2} weight="semibold">
            Save the document to see a live preview
          </Text>
          <Text size={1} muted>
            Once this email has at least one saved revision (draft or published), the
            preview iframe will render the email exactly as the customer receives it.
          </Text>
        </Stack>
      </CenteredCard>
    );
  }

  if (!isPreviewTemplateKey(displayed._type)) {
    return (
      <CenteredCard tone="caution">
        <Text size={1}>No preview available for type "{displayed._type}".</Text>
      </CenteredCard>
    );
  }

  if (error) {
    return (
      <CenteredCard tone="critical">
        <Stack space={2}>
          <Text size={2} weight="semibold">
            Preview failed to render
          </Text>
          <Text size={1} muted>
            {error}
          </Text>
        </Stack>
      </CenteredCard>
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
