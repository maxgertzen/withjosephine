import { createPreviewSecret } from "@sanity/preview-url-secret/create-secret";
import { Card, Flex, Stack, Text } from "@sanity/ui";
import type { SanityDocument } from "sanity";
import { useClient, useCurrentUser } from "sanity";
import { Iframe } from "sanity-plugin-iframe-pane";

type DocumentSlot = SanityDocument | null;

type EmailPreviewProps = {
  document?: {
    displayed?: DocumentSlot;
    draft?: DocumentSlot;
    published?: DocumentSlot;
  };
};

const PREVIEW_API_VERSION = "2024-01-01";
const PREVIEW_SECRET_SOURCE = "phase7-email-preview";

export function EmailPreview(props: EmailPreviewProps) {
  const displayed = props.document?.displayed ?? null;
  const client = useClient({ apiVersion: PREVIEW_API_VERSION });
  const currentUser = useCurrentUser();
  const studioOrigin =
    typeof window !== "undefined" ? window.location.origin : "https://withjosephine.sanity.studio";

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

  return (
    <Iframe
      document={{
        displayed,
        draft: props.document?.draft ?? null,
        published: props.document?.published ?? null,
      }}
      options={{
        url: async (doc) => {
          if (!doc) return new Error("No document loaded");
          const previewOrigin =
            process.env.SANITY_STUDIO_PREVIEW_URL ?? "https://withjosephine.com";
          const cacheKey = typeof doc._rev === "string" ? doc._rev : doc._updatedAt;
          const { secret } = await createPreviewSecret(
            client,
            PREVIEW_SECRET_SOURCE,
            studioOrigin,
            currentUser?.id,
          );
          const params = new URLSearchParams({
            rev: cacheKey,
            "sanity-preview-secret": secret,
          });
          return `${previewOrigin}/api/email-preview/${encodeURIComponent(doc._type)}?${params.toString()}`;
        },
        attributes: {
          sandbox: "allow-same-origin",
        },
        reload: { button: true },
        showDisplayUrl: false,
        defaultSize: "desktop",
      }}
    />
  );
}
