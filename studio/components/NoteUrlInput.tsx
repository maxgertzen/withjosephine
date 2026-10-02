import { CopyIcon } from "@sanity/icons";
import { Button, Card, Flex, Stack, Text } from "@sanity/ui";
import { useState } from "react";
import { type SlugInputProps, useDataset } from "sanity";

import { notePath } from "@/lib/notes/notes";

import { siteOriginFor } from "../lib/siteOrigins";

export function NoteUrlInput(props: SlugInputProps) {
  const dataset = useDataset();
  const [copied, setCopied] = useState(false);
  const slug = props.value?.current;
  const url = slug ? `${siteOriginFor(dataset)}${notePath(slug)}` : null;

  async function copy() {
    if (!url) return;
    await navigator.clipboard.writeText(url);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2000);
  }

  return (
    <Stack space={3}>
      {props.renderDefault(props)}
      {url ? (
        <Card padding={2} radius={2} tone="transparent" border>
          <Flex align="center" gap={2}>
            <Text size={1} style={{ flex: 1, wordBreak: "break-all" }}>
              {url}
            </Text>
            <Button
              mode="ghost"
              fontSize={1}
              icon={CopyIcon}
              text={copied ? "Copied" : "Copy link"}
              onClick={copy}
            />
          </Flex>
        </Card>
      ) : null}
    </Stack>
  );
}
