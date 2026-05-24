import { PortableText, type PortableTextComponents } from "@portabletext/react";
import type { PortableTextBlock } from "@portabletext/types";
import { Link, Text } from "@react-email/components";

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
    // Inline rendering — strip the block wrapper, just emit the children.
    // Caller is responsible for the surrounding paragraph element.
    normal: ({ children }) => <>{children}</>,
  },
  marks: components.marks,
};

export type PortableTextInlineProps = {
  value: PortableTextBlock[] | string[] | string | null | undefined;
};

/**
 * Inline render for Portable Text fields that already sit inside an
 * existing `<p>` / `<Text>` wrapper in the host template. Emits marks
 * (strong, em, link) without adding a block-level wrapper. Multi-block
 * input is joined by hard line breaks.
 */
export function PortableTextInline({ value }: PortableTextInlineProps) {
  if (!value) return null;
  if (typeof value === "string") return <>{value}</>;
  if (Array.isArray(value) && value.length === 0) return null;
  if (isStringArray(value)) {
    return (
      <>
        {value.map((paragraph, index) => (
          <span key={index}>
            {index > 0 ? <br /> : null}
            {paragraph}
          </span>
        ))}
      </>
    );
  }
  return <PortableText value={value} components={inlineComponents} />;
}

export type PortableTextBodyProps = {
  value: PortableTextBlock[] | string[] | string | null | undefined;
};

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((entry) => typeof entry === "string");
}

export function PortableTextBody({ value }: PortableTextBodyProps) {
  if (!value) return null;
  if (typeof value === "string") {
    return <Text className="text-base leading-[1.75]">{value}</Text>;
  }
  if (Array.isArray(value) && value.length === 0) return null;
  if (isStringArray(value)) {
    return (
      <>
        {value.map((paragraph, index) => (
          <Text key={index} className="text-base leading-[1.75]">
            {paragraph}
          </Text>
        ))}
      </>
    );
  }
  return <PortableText value={value} components={components} />;
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

export function stringToPortableTextBlocks(value: string): PortableTextBlock[] {
  return [
    {
      _type: "block",
      _key: hashKey(value),
      style: "normal",
      markDefs: [],
      children: [{ _type: "span", _key: `${hashKey(value)}-s0`, text: value, marks: [] }],
    },
  ];
}

function hashKey(input: string): string {
  let h = 0;
  for (let i = 0; i < input.length; i++) {
    h = (Math.imul(31, h) + input.charCodeAt(i)) | 0;
  }
  return Math.abs(h).toString(36).padStart(8, "0");
}
