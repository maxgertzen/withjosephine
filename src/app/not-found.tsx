import { NotFoundView } from "@/components/NotFoundView";
import { NOT_FOUND_PAGE_DEFAULTS } from "@/data/defaults";
import { fetchNotFoundPagePublished } from "@/lib/sanity/fetch";

export default async function NotFound() {
  const content = (await fetchNotFoundPagePublished()) ?? NOT_FOUND_PAGE_DEFAULTS;

  return <NotFoundView content={content} />;
}
