import { createDataAttribute } from "next-sanity";

import { studioUrl } from "./studioUrl";

export function editTarget(document: { id: string; type: string }, path: string): string {
  return createDataAttribute({ baseUrl: studioUrl, ...document, path }).toString();
}
