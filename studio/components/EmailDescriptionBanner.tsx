import { Card, Stack, Text } from "@sanity/ui";
import type { InputProps, ObjectSchemaType } from "sanity";

function isDocumentRoot(props: InputProps): props is InputProps & { schemaType: ObjectSchemaType } {
  return (
    props.id === "root" &&
    props.schemaType.jsonType === "object" &&
    (props.schemaType as ObjectSchemaType).name.startsWith("email")
  );
}

export function EmailDescriptionBanner(props: InputProps) {
  if (!isDocumentRoot(props) || !props.schemaType.description) {
    return props.renderDefault(props);
  }

  return (
    <Stack space={4}>
      <Card tone="primary" padding={4} radius={2} border>
        <Stack space={2}>
          <Text size={1} weight="semibold">
            About this email
          </Text>
          <Text size={1} muted>
            {props.schemaType.description}
          </Text>
        </Stack>
      </Card>
      {props.renderDefault(props)}
    </Stack>
  );
}
