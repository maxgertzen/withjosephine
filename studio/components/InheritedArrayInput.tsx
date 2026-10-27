import { Box, Button, Card, Flex, Stack, Text } from "@sanity/ui";
import { useEffect, useState } from "react";
import { type ArrayOfObjectsInputProps, set, unset } from "sanity";

import { useDraftsClient } from "../lib/draftsClient";
import { randomKey } from "../lib/randomKey";

type InheritedArrayInputOptions<Item> = {
  loadInherited: (client: ReturnType<typeof useDraftsClient>) => Promise<Item[]>;
  describe: (item: Item) => { title: string; subtitle?: string };
  itemType: string;
  inheritedHeading: string;
  inheritedEmptyText?: string;
  loadFailedText?: string;
  copyLabel: string;
  resetLabel?: string;
  emptyListInherits?: boolean;
};

type StoredItem = { _key?: string; _type?: string };

function keyed<Item extends object>(items: Item[], itemType: string) {
  return items.map((item) => ({
    ...item,
    _type: itemType,
    _key: randomKey(),
  }));
}

export function inheritedArrayInput<Item extends object>(options: InheritedArrayInputOptions<Item>) {
  return function InheritedArrayInput(props: ArrayOfObjectsInputProps) {
    const client = useDraftsClient();
    const [inherited, setInherited] = useState<Item[] | null>(null);
    const [loadFailed, setLoadFailed] = useState(false);
    const empty = !props.value || (props.value.length === 0 && options.emptyListInherits !== false);

    useEffect(() => {
      if (!empty) return;
      let cancelled = false;
      setLoadFailed(false);
      options
        .loadInherited(client)
        .then((items) => {
          if (!cancelled) setInherited(items);
        })
        .catch(() => {
          if (!cancelled) setLoadFailed(true);
        });
      return () => {
        cancelled = true;
      };
    }, [client, empty]);

    if (!empty) {
      return (
        <Stack space={3}>
          {props.renderDefault(props)}
          <Flex gap={2} wrap="wrap">
            {options.resetLabel ? (
              <Button
                mode="ghost"
                fontSize={1}
                text={options.resetLabel}
                disabled={props.readOnly}
                onClick={() => props.onChange(unset())}
              />
            ) : null}
          </Flex>
        </Stack>
      );
    }

    return (
      <Card padding={3} radius={2} border tone="transparent">
        <Stack space={3}>
          <Text size={1} muted>
            {loadFailed ? options.loadFailedText : options.inheritedHeading}
          </Text>
          {inherited?.length === 0 && options.inheritedEmptyText ? (
            <Text size={1}>{options.inheritedEmptyText}</Text>
          ) : null}
          <Stack space={2}>
            {(inherited ?? []).map((item, index) => {
              const row = options.describe(item);
              return (
                <Flex key={index} gap={2} align="center">
                  <Text size={1} weight="semibold">
                    {row.title}
                  </Text>
                  {row.subtitle ? (
                    <Text size={1} muted>
                      {row.subtitle}
                    </Text>
                  ) : null}
                </Flex>
              );
            })}
          </Stack>
          <Box>
            <Button
              tone="primary"
              fontSize={1}
              text={options.copyLabel}
              disabled={props.readOnly || inherited === null}
              onClick={() => inherited && props.onChange(set(keyed(inherited, options.itemType)))}
            />
          </Box>
        </Stack>
      </Card>
    );
  };
}
