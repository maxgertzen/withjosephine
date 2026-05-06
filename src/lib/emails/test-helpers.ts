/**
 * Test-only helpers for asserting email-render output.
 *
 * `@react-email/render` produces HTML with React-internal comment markers
 * (`<!-- -->`) between text nodes and entity-encoded apostrophes
 * (`&#x27;`). Asserting raw HTML contains a verbatim copy string from the
 * legacy renderer would fail on those purely-rendering artifacts. The
 * helpers here normalize rendered HTML so parity tests can compare on
 * meaning, not encoding.
 */

/** Decode the entities our renderer emits for visible-text comparison. */
function decodeBasicEntities(html: string): string {
  return html
    .replace(/&#x27;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&nbsp;/g, " ");
}

/** Visible text from a rendered email, with React comment markers stripped
 *  and whitespace collapsed. Use when asserting copy parity. */
export function visibleText(html: string): string {
  const dom = new DOMParser().parseFromString(html, "text/html");
  // The Preview header is rendered as a hidden block with the preview copy
  // followed by zero-width-joiner padding — exclude it so legacy body-only
  // assertions aren't fooled.
  dom.querySelectorAll('[data-skip-in-text="true"]').forEach((node) => node.remove());
  const text = dom.body.textContent ?? "";
  return decodeBasicEntities(text).replace(/\s+/g, " ").trim();
}

/** Set of href URLs from `<a>` tags. Use when asserting link parity. */
export function linkHrefs(html: string): Set<string> {
  const dom = new DOMParser().parseFromString(html, "text/html");
  const anchors = Array.from(dom.querySelectorAll("a"));
  return new Set(anchors.map((a) => a.getAttribute("href") ?? ""));
}

/**
 * Assert that the rendered HTML uses the brand tokens we care about. Each
 * named token is checked for presence (case-insensitive). Pass only the
 * tokens that are load-bearing for the email — e.g. `signature` emails
 * don't necessarily need a `gold` accent.
 */
export function assertBrandTokens(
  html: string,
  tokens: { serif?: boolean; ink?: boolean; gold?: boolean; cream?: boolean; warm?: boolean; body?: boolean },
): void {
  const haystack = html.toLowerCase();
  if (tokens.serif && !/cormorant garamond/i.test(html)) {
    throw new Error("expected rendered HTML to use the Cormorant Garamond serif token");
  }
  if (tokens.ink && !haystack.includes("#1c1935")) {
    throw new Error("expected rendered HTML to use the ink token #1C1935");
  }
  if (tokens.gold && !haystack.includes("#c4a46b")) {
    throw new Error("expected rendered HTML to use the gold token #C4A46B");
  }
  if (tokens.cream && !haystack.includes("#faf8f4")) {
    throw new Error("expected rendered HTML to use the cream token #FAF8F4");
  }
  if (tokens.warm && !haystack.includes("#f5f0e8")) {
    throw new Error("expected rendered HTML to use the warm token #F5F0E8");
  }
  if (tokens.body && !haystack.includes("#3d3633")) {
    throw new Error("expected rendered HTML to use the body color token #3D3633");
  }
}
