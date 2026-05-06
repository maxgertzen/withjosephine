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
