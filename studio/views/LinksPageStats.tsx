import { Box, Card, Flex, Stack, Text } from "@sanity/ui";
import { useEffect, useState } from "react";
import { useDataset } from "sanity";

import { TT_TAP_COUNTS_API_ROUTE } from "../../src/lib/http/routes";
import { workerOriginFor } from "../lib/siteOrigins";

type ButtonTaps = { key: string; label: string; last7Days: number; last30Days: number };

type TapCountsState =
  | { status: "loading" }
  | { status: "failed" }
  | { status: "onlineOnly" }
  | { status: "loaded"; buttons: ButtonTaps[] };

export const TAP_COUNTS_WORDS = {
  intro: "How many times each button on the published page was tapped. Nothing about the person who tapped is kept.",
  loading: "Loading the tap counts…",
  failed: "The tap counts could not load. Try again in a minute.",
  onlineOnly: "Tap counts only show in the online Studio.",
  noButtons: "The published page has no buttons yet.",
  button: "Button",
  last7Days: "Taps in the last 7 days",
  last30Days: "Taps in the last 30 days",
};

async function loadTapCounts(origin: string): Promise<ButtonTaps[]> {
  const response = await fetch(`${origin}${TT_TAP_COUNTS_API_ROUTE}`);
  if (!response.ok) throw new Error(`tap counts answered ${response.status}`);
  const body = (await response.json()) as { buttons: ButtonTaps[] };
  return body.buttons;
}

function Message({ children }: { children: string }) {
  return (
    <Card padding={4}>
      <Text size={2}>{children}</Text>
    </Card>
  );
}

function TapRow({ cells, bold = false }: { cells: [string, string, string]; bold?: boolean }) {
  const weight = bold ? "semibold" : "regular";
  return (
    <Flex gap={3} align="center">
      {cells.map((cell, index) => (
        <Box key={index} flex={index === 0 ? 2 : 1}>
          <Text weight={weight} align={index === 0 ? "left" : "right"}>
            {cell}
          </Text>
        </Box>
      ))}
    </Flex>
  );
}

export function LinksPageStats() {
  const origin = workerOriginFor(useDataset(), window.location.origin);
  const [state, setState] = useState<TapCountsState>(origin ? { status: "loading" } : { status: "onlineOnly" });

  useEffect(() => {
    if (!origin) return;
    let current = true;
    loadTapCounts(origin).then(
      (buttons) => current && setState({ status: "loaded", buttons }),
      () => current && setState({ status: "failed" }),
    );
    return () => {
      current = false;
    };
  }, [origin]);

  if (state.status !== "loaded") return <Message>{TAP_COUNTS_WORDS[state.status]}</Message>;
  if (state.buttons.length === 0) return <Message>{TAP_COUNTS_WORDS.noButtons}</Message>;

  return (
    <Card padding={4}>
      <Stack space={4}>
        <Text size={1} muted>
          {TAP_COUNTS_WORDS.intro}
        </Text>
        <TapRow bold cells={[TAP_COUNTS_WORDS.button, TAP_COUNTS_WORDS.last7Days, TAP_COUNTS_WORDS.last30Days]} />
        {state.buttons.map((button) => (
          <TapRow key={button.key} cells={[button.label, String(button.last7Days), String(button.last30Days)]} />
        ))}
      </Stack>
    </Card>
  );
}
