import { LaunchIcon } from "@sanity/icons";
import { Box, Button, Flex } from "@sanity/ui";
import type { ObjectInputProps } from "sanity";

const previewOrigin =
  process.env.SANITY_STUDIO_PREVIEW_URL ?? "http://localhost:3000";

export function ConsentBannerInput(props: ObjectInputProps) {
  function openPreview() {
    const target = `${previewOrigin}/api/draft/enable?slug=/`;
    window.open(target, "_blank", "noopener,noreferrer");
  }

  return (
    <Flex direction="column" gap={3}>
      <Box>
        <Button
          icon={LaunchIcon}
          mode="ghost"
          tone="primary"
          text="Preview consent banner"
          onClick={openPreview}
        />
      </Box>
      <Box>{props.renderDefault(props)}</Box>
    </Flex>
  );
}
