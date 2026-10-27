import { Box, Flex, Switch, Text, Tooltip } from "@sanity/ui";
import { type ObjectItemProps, set } from "sanity";

import { FORM_SECTION } from "../../src/lib/booking/bookingPageSections";

export function BookingPageSectionRow(props: ObjectItemProps) {
  const shown = (props.value as { shown?: boolean }).shown !== false;
  if (props.schemaType.name === FORM_SECTION) return props.renderDefault(props);

  return (
    <Flex align="center" gap={2}>
      <Box flex={1}>{props.renderDefault(props)}</Box>
      <Tooltip
        content={
          <Box padding={2}>
            <Text size={1}>{shown ? "On the page. Switch off to hide it." : "Hidden. Switch on to show it."}</Text>
          </Box>
        }
        placement="left"
        portal
      >
        <Box paddingRight={2}>
          <Switch
            checked={shown}
            disabled={props.readOnly}
            aria-label={shown ? "Hide this from the page" : "Show this on the page"}
            onChange={() => props.inputProps.onChange(set(!shown, ["shown"]))}
          />
        </Box>
      </Tooltip>
    </Flex>
  );
}
