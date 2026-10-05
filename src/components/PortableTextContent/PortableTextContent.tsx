import {
  PortableText,
  type PortableTextComponentProps,
  type PortableTextComponents,
  type PortableTextMarkComponentProps,
} from "@portabletext/react";
import type { PortableTextBlock } from "@portabletext/types";
import Link from "next/link";

import type { SanityPortableTextBlock } from "@/lib/sanity/types";

type LinkMark = {
  _type: string;
  _key: string;
  href?: string;
};

const BODY_TEXT = "font-body text-base text-j-text leading-[1.9]";
const LIST = `${BODY_TEXT} flex flex-col gap-3 pl-5 mt-3`;

const BLOCK_STYLES = {
  normal: ({ children }: PortableTextComponentProps<PortableTextBlock>) => (
    <p className={`${BODY_TEXT} mt-5 first:mt-0`}>{children}</p>
  ),
  h2: ({ children }: PortableTextComponentProps<PortableTextBlock>) => (
    <h2 className="font-display text-2xl italic text-j-text-heading mt-12 mb-4">{children}</h2>
  ),
  h3: ({ children }: PortableTextComponentProps<PortableTextBlock>) => (
    <h3 className="font-display text-xl italic text-j-text-heading mt-8 mb-3">{children}</h3>
  ),
  blockquote: ({ children }: PortableTextComponentProps<PortableTextBlock>) => (
    <blockquote className="border-l-2 border-j-border-gold pl-4 my-8 font-display italic text-[1.625rem] leading-[1.35] text-j-text">
      {children}
    </blockquote>
  ),
} satisfies PortableTextComponents["block"];

const components: PortableTextComponents = {
  block: BLOCK_STYLES,
  list: {
    bullet: ({ children }) => <ul className={`${LIST} list-disc`}>{children}</ul>,
    number: ({ children }) => <ol className={`${LIST} list-decimal`}>{children}</ol>,
  },
  listItem: {
    bullet: ({ children }) => <li>{children}</li>,
    number: ({ children }) => <li>{children}</li>,
  },
  marks: {
    strong: ({ children }) => <strong className="font-medium">{children}</strong>,
    em: ({ children }) => <em className="italic">{children}</em>,
    link: ({ value, children }: PortableTextMarkComponentProps<LinkMark>) => {
      const href = value?.href ?? "#";
      const className = "text-j-text-gold hover:underline";

      if (!/^(https?:|mailto:|tel:|\/)/.test(href)) {
        return <span className={className}>{children}</span>;
      }

      if (href.startsWith("mailto:") || href.startsWith("tel:")) {
        return (
          <a href={href} className={className}>
            {children}
          </a>
        );
      }

      if (href.startsWith("/")) {
        return (
          <Link href={href} className={className}>
            {children}
          </Link>
        );
      }

      return (
        <a href={href} target="_blank" rel="noopener noreferrer" className={className}>
          {children}
          <span className="sr-only"> (opens in a new tab)</span>
        </a>
      );
    },
  },
};

interface PortableTextContentProps {
  value: SanityPortableTextBlock[];
  paragraphClassName?: string;
}

const componentsByParagraphClass = new Map<string, PortableTextComponents>();

function componentsWithParagraphClass(paragraphClassName: string): PortableTextComponents {
  const cached = componentsByParagraphClass.get(paragraphClassName);
  if (cached) return cached;
  const built: PortableTextComponents = {
    ...components,
    block: {
      ...BLOCK_STYLES,
      normal: ({ children }: PortableTextComponentProps<PortableTextBlock>) => (
        <p className={paragraphClassName}>{children}</p>
      ),
    },
  };
  componentsByParagraphClass.set(paragraphClassName, built);
  return built;
}

export function PortableTextContent({ value, paragraphClassName }: PortableTextContentProps) {
  const chosen = paragraphClassName ? componentsWithParagraphClass(paragraphClassName) : components;
  return <PortableText value={value} components={chosen} />;
}
