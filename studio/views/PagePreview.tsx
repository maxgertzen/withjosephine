import { Card, Flex, Stack, Text } from "@sanity/ui";

/**
 * Iframes a `/preview/<surface>` route on the deployed site so Becky can
 * see the actual rendered page (listen / my-readings / my-gifts) with
 * fixture state — the real surfaces are auth-gated and Studio can't see
 * past the sign-in card otherwise.
 */

type PageSurface = "listen" | "my-readings" | "my-gifts";

const SURFACE_DEFAULT_STATE: Record<PageSurface, string> = {
  listen: "delivered",
  "my-readings": "list",
  "my-gifts": "list",
};

const SURFACE_LABEL: Record<PageSurface, string> = {
  listen: "Listen page preview",
  "my-readings": "My Readings preview",
  "my-gifts": "My Gifts preview",
};

function buildPreviewUrl(surface: PageSurface): string {
  const previewOrigin =
    process.env.SANITY_STUDIO_PREVIEW_URL ?? "https://withjosephine.com";
  return `${previewOrigin}/preview/${surface}?state=${SURFACE_DEFAULT_STATE[surface]}`;
}

function makeView(surface: PageSurface) {
  return function PagePreview() {
    const url = buildPreviewUrl(surface);
    return (
      <Flex direction="column" style={{ height: "100%" }}>
        <Card padding={2} tone="transparent" border style={{ borderRadius: 0 }}>
          <Stack space={1}>
            <Text size={1} weight="semibold">
              {SURFACE_LABEL[surface]}
            </Text>
            <Text size={1} muted>
              State switcher lives inside the preview iframe. The page reads live Sanity
              copy + fixture state — never real customer data.
            </Text>
          </Stack>
        </Card>
        <iframe
          src={url}
          title={SURFACE_LABEL[surface]}
          style={{ flex: 1, width: "100%", minHeight: 0, border: "none" }}
        />
      </Flex>
    );
  };
}

export const ListenPagePreview = makeView("listen");
export const MyReadingsPagePreview = makeView("my-readings");
export const MyGiftsPagePreview = makeView("my-gifts");
