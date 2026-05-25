import type { PortableTextBlock, PortableTextSpan } from "@portabletext/types";
import { Link, Text } from "@react-email/components";
import { Fragment, type ReactNode } from "react";

import { stringToPortableTextBlocks } from "./portableTextBuild";

// Hand-rolled PT-block renderer. We deliberately do NOT use `@portabletext/react`
// here: its `<PortableText>` component calls `useMemo` at the top of render,
// and the @react-email/render path inside the Cloudflare workerd worker
// dispatches into a React entry where the dispatcher is null for hooks called
// from a function-component nested under `renderToReadableStream`. The classic
// "Cannot read properties of null (reading 'useMemo')" surface bit the gift
// email send paths in production after PR #188 (the equivalent throw in the
// OC + Day7 + Magic-link + Privacy-export render paths is silently swallowed
// by upstream `.catch()` handlers; the gift paths have no catch, so the throw
// reaches the route handler and returns 500). Our renderer is plain JSX with
// zero hooks — every existing email template uses only `normal` styles and
// `strong`/`em`/`link` marks, which we cover here. Anything richer would need
// to be added here as a separate, hook-free branch.
//
// Revisit when @portabletext/react ships a `react-server` export condition
// (or we drop the workerd target) — at that point we can restore the upstream
// renderer.

function isPortableTextBlock(entry: unknown): entry is PortableTextBlock {
  if (entry === null || typeof entry !== "object") return false;
  return (entry as { _type?: unknown })._type === "block";
}

function isPortableTextSpan(entry: unknown): entry is PortableTextSpan {
  if (entry === null || typeof entry !== "object") return false;
  return (entry as { _type?: unknown })._type === "span";
}

function warnNonPortableText(value: unknown): void {
  if (process.env.NODE_ENV === "production") return;
  console.warn("[PortableTextBody] received non-PT value, coercing", value);
}

function sanitizeToPortableTextBlocks(value: unknown): PortableTextBlock[] {
  if (value == null) return [];
  if (Array.isArray(value) && value.every(isPortableTextBlock)) {
    return value;
  }
  if (typeof value === "string") {
    if (value.trim().length === 0) return [];
    warnNonPortableText(value);
    return stringToPortableTextBlocks(value);
  }
  if (Array.isArray(value) && value.every((entry) => typeof entry === "string")) {
    warnNonPortableText(value);
    return value.flatMap((entry) => stringToPortableTextBlocks(entry));
  }
  warnNonPortableText(value);
  return [];
}

function findLinkHref(
  markDefs: PortableTextBlock["markDefs"] | undefined,
  key: string,
): string | undefined {
  if (!Array.isArray(markDefs)) return undefined;
  for (const def of markDefs) {
    if (def?._key !== key) continue;
    const candidate = def.href;
    if (typeof candidate === "string") return candidate;
  }
  return undefined;
}

function renderMarks(
  text: string,
  marks: readonly string[] | undefined,
  markDefs: PortableTextBlock["markDefs"] | undefined,
  keyPrefix: string,
): ReactNode {
  let node: ReactNode = text;
  if (!marks || marks.length === 0) return node;
  // Outermost mark wraps last so the rendered nesting reads
  // markDefs[0] → markDefs[N-1] → text from the outside in.
  for (let i = marks.length - 1; i >= 0; i -= 1) {
    const mark = marks[i];
    const childKey = `${keyPrefix}-m${i}`;
    if (mark === "strong") {
      node = <strong key={childKey}>{node}</strong>;
    } else if (mark === "em") {
      node = <em key={childKey}>{node}</em>;
    } else {
      const href = findLinkHref(markDefs, mark);
      if (href) {
        node = (
          <Link key={childKey} href={href} className="text-ink underline">
            {node}
          </Link>
        );
      }
    }
  }
  return node;
}

function renderBlockChildren(block: PortableTextBlock, blockKey: string): ReactNode {
  const children = Array.isArray(block.children) ? block.children : [];
  return children.map((child, idx) => {
    if (!isPortableTextSpan(child)) return null;
    const text = typeof child.text === "string" ? child.text : "";
    const childKey = child._key ?? `${blockKey}-c${idx}`;
    const node = renderMarks(text, child.marks, block.markDefs, childKey);
    return <Fragment key={childKey}>{node}</Fragment>;
  });
}

function getBlockKey(block: PortableTextBlock, idx: number): string {
  return block._key && block._key.length > 0 ? block._key : `block-${idx}`;
}

export type PortableTextInlineProps = {
  value: PortableTextBlock[] | null | undefined;
};

export function PortableTextInline({ value }: PortableTextInlineProps) {
  const blocks = sanitizeToPortableTextBlocks(value);
  if (blocks.length === 0) return null;
  return (
    <>
      {blocks.map((block, idx) => {
        const key = getBlockKey(block, idx);
        return <Fragment key={key}>{renderBlockChildren(block, key)}</Fragment>;
      })}
    </>
  );
}

export type PortableTextBodyProps = {
  value: PortableTextBlock[] | null | undefined;
};

export function hasBodyContent(
  value: PortableTextBlock[] | null | undefined,
): boolean {
  if (value == null) return false;
  return value.length > 0;
}

export function PortableTextBody({ value }: PortableTextBodyProps) {
  const blocks = sanitizeToPortableTextBlocks(value);
  if (blocks.length === 0) return null;
  return (
    <>
      {blocks.map((block, idx) => {
        const key = getBlockKey(block, idx);
        return (
          <Text key={key} className="text-base leading-[1.75]">
            {renderBlockChildren(block, key)}
          </Text>
        );
      })}
    </>
  );
}

export function portableTextToPlainText(
  value: PortableTextBlock[] | string | null | undefined,
): string {
  if (!value) return "";
  if (typeof value === "string") return value;
  return value
    .map((block) => {
      if (block._type !== "block" || !Array.isArray(block.children)) return "";
      return (block.children as Array<{ text?: unknown }>)
        .map((child) => (typeof child.text === "string" ? child.text : ""))
        .join("");
    })
    .join("\n\n");
}

export { stringToPortableTextBlocks } from "./portableTextBuild";
