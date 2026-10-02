const SANITY_CDN = "https://cdn.sanity.io/";

export function sanityImageUrl(url: string, params: Record<string, string | number>): string {
  if (!url.startsWith(SANITY_CDN)) return url;
  const query = new URLSearchParams(
    Object.entries({ ...params, auto: "format" }).map(([key, value]) => [key, String(value)]),
  );
  return `${url}?${query}`;
}
