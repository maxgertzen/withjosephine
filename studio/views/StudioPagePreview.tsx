import { Card, Flex, Select, Stack, Text } from "@sanity/ui";
import type { CardTone } from "@sanity/ui";
import { useEffect, useState } from "react";
import type { ChangeEvent, ReactNode } from "react";
import type { SanityDocument } from "sanity";

import { renderPagePreview } from "@/lib/page-previews/render-preview-pages";
import {
  previewStateKeysFor,
  type PreviewSurface,
} from "@/lib/page-previews/preview-fixtures-pages";

import { PREVIEW_STYLES } from "../.generated/preview-styles";

type DocumentSlot = SanityDocument | null;

type StudioPagePreviewProps = {
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

function makeStudioPagePreview(surface: PreviewSurface, label: string) {
  return function StudioPagePreview(props: StudioPagePreviewProps) {
    const displayed = props.document?.displayed ?? null;
    const stateKeys = previewStateKeysFor(surface);
    const [stateKey, setStateKey] = useState<string>(stateKeys[0] ?? "");
    const [html, setHtml] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [renderTick, setRenderTick] = useState(0);

    useEffect(() => {
      let cancelled = false;
      renderPagePreview(surface, stateKey, displayed, PREVIEW_STYLES)
        .then((rendered) => {
          if (!cancelled) {
            setHtml(rendered);
            setError(null);
            setRenderTick((tick) => tick + 1);
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
    }, [displayed, stateKey]);

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
      <Flex direction="column" style={{ height: "100%" }}>
        <Card padding={3} tone="transparent" border style={{ borderRadius: 0 }}>
          <Flex align="center" gap={3}>
            <Text size={1} weight="semibold" style={{ flexShrink: 0 }}>
              {label} — state:
            </Text>
            <Select
              fontSize={1}
              padding={2}
              value={stateKey}
              onChange={(event: ChangeEvent<HTMLSelectElement>) => setStateKey(event.target.value)}
            >
              {stateKeys.map((key) => (
                <option key={key} value={key}>
                  {key}
                </option>
              ))}
            </Select>
            <Text size={1} muted>
              Fixture state — never real customer data.
            </Text>
          </Flex>
        </Card>
        <iframe
          key={`${surface}-${stateKey}-${renderTick}`}
          srcDoc={html ?? ""}
          title={`${label} preview — ${stateKey}`}
          sandbox=""
          style={{ flex: 1, width: "100%", minHeight: 0, border: "none", background: "#FAF8F4" }}
        />
      </Flex>
    );
  };
}

export const ListenPagePreview = makeStudioPagePreview("listen", "Listen page");
export const MagicLinkVerifyPagePreview = makeStudioPagePreview("magic-link-verify", "Magic Link Confirm page");
export const ThankYouPagePreview = makeStudioPagePreview("thank-you", "Thank You page");
