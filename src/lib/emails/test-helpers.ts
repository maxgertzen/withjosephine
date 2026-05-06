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
 * Tailwind's `<Tailwind>` provider compiles classNames to inline rgb()
 * values, while raw inline `color: #...` styles emit hex. To keep parity
 * tests resilient to either form, we accept both representations of each
 * brand token.
 */
const TOKEN_VARIANTS: Record<string, ReadonlyArray<string>> = {
  ink: ["#1c1935", "rgb(28,25,53)"],
  body: ["#3d3633", "rgb(61,54,51)"],
  muted: ["#7a6f6a", "rgb(122,111,106)"],
  divider: ["#e8d5c4", "rgb(232,213,196)"],
  cream: ["#faf8f4", "rgb(250,248,244)"],
  warm: ["#f5f0e8", "rgb(245,240,232)"],
  gold: ["#c4a46b", "rgb(196,164,107)"],
};

/**
 * Assert that the rendered HTML uses the brand tokens we care about. Each
 * named token is checked for presence (case-insensitive, hex or rgb form).
 * Pass only the tokens that are load-bearing for the email.
 */
export function assertBrandTokens(
  html: string,
  tokens: { serif?: boolean; ink?: boolean; gold?: boolean; cream?: boolean; warm?: boolean; body?: boolean; muted?: boolean; divider?: boolean },
): void {
  const haystack = html.toLowerCase().replace(/\s+/g, "");
  if (tokens.serif && !/cormorant garamond/i.test(html)) {
    throw new Error("expected rendered HTML to use the Cormorant Garamond serif token");
  }
  for (const [name, variants] of Object.entries(TOKEN_VARIANTS)) {
    if (tokens[name as keyof typeof tokens] !== true) continue;
    const found = variants.some((v) => haystack.includes(v));
    if (!found) {
      throw new Error(`expected rendered HTML to use the ${name} token (any of: ${variants.join(", ")})`);
    }
  }
}
