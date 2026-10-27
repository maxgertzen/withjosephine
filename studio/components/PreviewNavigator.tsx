import { Box, Button, Card, Label, Spinner, Stack } from "@sanity/ui";
import { useEffect, useState } from "react";
import { usePresentationNavigate, usePresentationParams } from "sanity/presentation";

import { usePerspectiveClient } from "../lib/draftsClient";
import { type PageGroup, pageGroups, type PreviewPageDocs } from "../lib/previewPageGroups";

const NOT_A_RELEASE = `!(_id in path("versions.**"))`;

const PAGES_QUERY = `{
  "readings": *[_type == "reading" && defined(slug.current) && ${NOT_A_RELEASE}] | order(orderRank) { _id, "title": name, "slug": slug.current, onSite },
  "notes": *[_type == "article" && defined(slug.current) && ${NOT_A_RELEASE}] | order(publishedAt desc) { _id, title, "slug": slug.current },
  "legal": *[_type == "legalPage" && defined(slug.current) && ${NOT_A_RELEASE}] | order(title asc) { _id, title, "slug": slug.current }
}`;

export function PreviewNavigator() {
  const client = usePerspectiveClient("raw");
  const navigate = usePresentationNavigate();
  const previewUrl = usePresentationParams(false)?.preview;
  const currentPath = previewUrl ? new URL(previewUrl, window.location.origin).pathname : undefined;
  const [groups, setGroups] = useState<PageGroup[] | null>(null);

  useEffect(() => {
    const subscription = client.observable.fetch<PreviewPageDocs>(PAGES_QUERY).subscribe((docs) => setGroups(pageGroups(docs)));
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
                key={`${page.title}|${page.href}`}
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
