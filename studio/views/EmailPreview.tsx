import { Card, Flex, Stack, Text } from "@sanity/ui";

type EmailPreviewProps = {
  document?: {
    displayed?: { _id?: string; _type?: string } | null;
  };
};

function stripDraftPrefix(id: string | undefined): string {
  if (!id) return "";
  return id.startsWith("drafts.") ? id.slice("drafts.".length) : id;
}

export function EmailPreview(props: EmailPreviewProps) {
  const previewOrigin = process.env.SANITY_STUDIO_PREVIEW_URL ?? "https://withjosephine.com";
  const displayed = props.document?.displayed ?? {};
  const docId = stripDraftPrefix(displayed._id);
  const type = displayed._type;
  const src = type ? `${previewOrigin}/api/email-preview/${encodeURIComponent(type)}` : null;

  if (!docId || !type || !src) {
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
    <Flex direction="column" style={{ height: "100%", width: "100%" }}>
      <iframe
        title={`Email preview — ${type}`}
        src={src}
        sandbox="allow-same-origin"
        style={{
          width: "100%",
          height: "100%",
          border: "none",
          backgroundColor: "#FAF8F4",
        }}
      />
    </Flex>
  );
}
