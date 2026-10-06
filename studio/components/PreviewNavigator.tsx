import { Box, Button, Card, Label, Spinner, Stack } from "@sanity/ui";
import { useEffect, useMemo, useState } from "react";
import { useClient } from "sanity";
import { usePresentationNavigate, usePresentationParams } from "sanity/presentation";

import { type PageGroup, pageGroups } from "../lib/previewPageGroups";

const DRAFTS_PERSPECTIVE_API_VERSION = "2025-02-19";

const PAGES_QUERY = `{
  "readings": *[_type == "reading" && defined(slug.current)] | order(order asc) { "title": name, "slug": slug.current },
  "notes": *[_type == "article" && defined(slug.current)] | order(publishedAt desc) { title, "slug": slug.current },
  "legal": *[_type == "legalPage" && defined(slug.current)] | order(title asc) { title, "slug": slug.current }
}`;

export function PreviewNavigator() {
  const baseClient = useClient({ apiVersion: DRAFTS_PERSPECTIVE_API_VERSION });
  const client = useMemo(() => baseClient.withConfig({ perspective: "drafts" }), [baseClient]);
  const navigate = usePresentationNavigate();
  const previewUrl = usePresentationParams(false)?.preview;
  const currentPath = previewUrl ? new URL(previewUrl, window.location.origin).pathname : undefined;
  const [groups, setGroups] = useState<PageGroup[] | null>(null);

  useEffect(() => {
    const subscription = client.observable.fetch(PAGES_QUERY).subscribe((docs) => setGroups(pageGroups(docs)));
    return () => subscription.unsubscribe();
  }, [client]);

  if (!groups) {
    return (
      <Box padding={4}>
        <Spinner muted />
      </Box>
    );
  }

  return (
    <Card height="fill" overflow="auto" padding={2}>
      <Stack space={4} paddingY={2}>
        {groups.map((group) => (
          <Stack key={group.title} space={1}>
            <Box paddingX={3} paddingBottom={1}>
              <Label muted size={1}>
                {group.title}
              </Label>
            </Box>
            {group.pages.map((page) => (
              <Button
                key={page.href}
                mode="bleed"
                justify="flex-start"
                text={page.title}
                selected={page.href === currentPath}
                onClick={() => navigate(page.href)}
              />
            ))}
          </Stack>
        ))}
      </Stack>
    </Card>
  );
}
