import { Box, Flex, Text } from "@sanity/ui";
import { type NumberInputProps, set } from "sanity";

import { MAX_READING_FACTS } from "../../src/data/defaults";

export function FactsPerRowSlider({ value, onChange, elementProps, schemaType }: NumberInputProps) {
  const current = value ?? (typeof schemaType.initialValue === "number" ? schemaType.initialValue : 1);
  return (
    <Flex align="center" gap={3}>
      <Box flex={1}>
        <input
          id={elementProps.id}
          type="range"
          min={1}
          max={MAX_READING_FACTS}
          step={1}
          value={current}
          onChange={(event) => onChange(set(Number(event.currentTarget.value)))}
          style={{ width: "100%" }}
        />
      </Box>
      <Text size={2} weight="semibold">
        {current}
      </Text>
    </Flex>
  );
}
