import { Card, Stack, Text } from "@sanity/ui";
import type { StringInputProps } from "sanity";

// Hardcoded per PRD anti-criterion ISC-A4 — Studio is a separate bundle and
// can't import from src/lib/constants.ts (env-bridge is intentionally absent).
const R2_PUBLIC_ORIGIN = "https://images.withjosephine.com";

export function PhotoR2Preview(props: StringInputProps) {
  const key = typeof props.value === "string" ? props.value.trim() : "";
  return (
    <Stack space={3}>
      {key ? (
        <Card padding={2} radius={2} shadow={1} tone="transparent">
          <img
            src={`${R2_PUBLIC_ORIGIN}/${key}`}
            alt="Submitted photo"
            width={200}
            height={200}
            loading="lazy"
            style={{ width: 200, height: 200, objectFit: "cover", display: "block" }}
          />
        </Card>
      ) : (
        <Card padding={2} radius={2} tone="transparent" border>
          <Text size={1} muted>No photo uploaded</Text>
        </Card>
      )}
      {props.renderDefault(props)}
    </Stack>
  );
}
