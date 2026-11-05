import { NotFoundView } from "@/components/NotFoundView";
import { NOT_FOUND_PAGE_DEFAULTS } from "@/data/defaults";
import { withNonBlankOverrides } from "@/lib/content/nonBlank";
import { fetchNotFoundPagePublished } from "@/lib/sanity/fetch";

export default async function NotFound() {
  const content = withNonBlankOverrides(NOT_FOUND_PAGE_DEFAULTS, await fetchNotFoundPagePublished());

  return <NotFoundView content={content} />;
}
