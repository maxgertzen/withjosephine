import { Card, Code, Flex, Stack, Text } from "@sanity/ui";

import { EMAIL_ALLOWED_SLOTS, type EmailTemplateKey } from "../../src/lib/emails/slots";

export function tokenCatalogBanner(source: EmailTemplateKey | readonly string[]) {
  const tokens = Array.isArray(source) ? source : EMAIL_ALLOWED_SLOTS[source as EmailTemplateKey];
  return function TokenCatalogBannerField() {
    return (
      <Card tone="primary" padding={4} radius={2} border>
        <Stack space={3}>
          <Text size={1} weight="semibold">
            Tokens you can use
          </Text>
          <Text size={1} muted>
            Type any of these in any text field (subject, greeting, body, etc.) — they auto-substitute when the email sends.
          </Text>
          {tokens.length === 0 ? (
            <Text size={1} muted>
              (this email has no tokens)
            </Text>
          ) : (
            <Flex gap={2} wrap="wrap">
              {tokens.map((token) => (
                <Code key={token} size={1}>{`{${token}}`}</Code>
              ))}
            </Flex>
          )}
        </Stack>
      </Card>
    );
  };
}
