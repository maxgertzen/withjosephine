import { Card, Stack, Text } from "@sanity/ui";
import { type StringInputProps, useDataset } from "sanity";

const R2_PUBLIC_ORIGIN_BY_DATASET: Record<string, string> = {
  production: "https://images.withjosephine.com",
  staging: "https://staging-images.withjosephine.com",
};

const R2_FALLBACK_ORIGIN = "https://images.withjosephine.com";

export function PhotoR2Preview(props: StringInputProps) {
  const dataset = useDataset();
  const origin = R2_PUBLIC_ORIGIN_BY_DATASET[dataset] ?? R2_FALLBACK_ORIGIN;
  const key = typeof props.value === "string" ? props.value.trim() : "";
  return (
    <Stack space={3}>
      {key ? (
        <Card padding={2} radius={2} shadow={1} tone="transparent">
          <img
            src={`${origin}/${key}`}
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
