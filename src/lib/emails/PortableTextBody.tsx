import { PortableText, type PortableTextComponents } from "@portabletext/react";
import type { PortableTextBlock } from "@portabletext/types";
import { Link, Text } from "@react-email/components";

import { stringToPortableTextBlocks } from "./portableTextBuild";

const components: PortableTextComponents = {
  block: {
    normal: ({ children }) => (
      <Text className="text-base leading-[1.75]">{children}</Text>
    ),
  },
  marks: {
    strong: ({ children }) => <strong>{children}</strong>,
    em: ({ children }) => <em>{children}</em>,
    link: ({ value, children }) => (
      <Link href={value?.href} className="text-ink underline">
        {children}
      </Link>
    ),
  },
};

const inlineComponents: PortableTextComponents = {
  block: {
    normal: ({ children }) => <>{children}</>,
  },
  marks: components.marks,
};

function isPortableTextBlock(entry: unknown): entry is PortableTextBlock {
  if (entry === null || typeof entry !== "object") return false;
  const block = entry as { _type?: unknown };
  return typeof block._type === "string";
}

function sanitizeToPortableTextBlocks(value: unknown): PortableTextBlock[] {
  if (value == null) return [];
  if (Array.isArray(value) && value.every(isPortableTextBlock)) {
    return value;
  }
  if (typeof value === "string") {
    if (value.trim().length === 0) return [];
    console.warn(
      "[PortableTextBody] received non-PT value, coercing via stringToPortableTextBlocks",
      value,
    );
    return stringToPortableTextBlocks(value);
  }
  if (Array.isArray(value) && value.every((entry) => typeof entry === "string")) {
    console.warn(
      "[PortableTextBody] received non-PT value, coercing via stringToPortableTextBlocks",
      value,
    );
    return value.flatMap((entry) => stringToPortableTextBlocks(entry));
  }
  return [];
}

export type PortableTextInlineProps = {
  value: PortableTextBlock[] | null | undefined;
};

export function PortableTextInline({ value }: PortableTextInlineProps) {
  const blocks = sanitizeToPortableTextBlocks(value);
  if (blocks.length === 0) return null;
  return <PortableText value={blocks} components={inlineComponents} />;
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
  return <PortableText value={blocks} components={components} />;
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
