import {
  PortableText,
  type PortableTextComponents,
  type PortableTextMarkComponentProps,
} from "@portabletext/react";
import Link from "next/link";

import type { SanityPortableTextBlock } from "@/lib/sanity/types";

type LinkMark = {
  _type: string;
  _key: string;
  href?: string;
};

const components: PortableTextComponents = {
  block: {
    normal: ({ children }) => (
      <p className="font-body text-base text-j-text leading-[1.9] font-light mt-5 first:mt-0">
        {children}
      </p>
    ),
    h2: ({ children }) => (
      <h2 className="font-display text-2xl italic text-j-text-heading mt-12 mb-4">{children}</h2>
    ),
    h3: ({ children }) => (
      <h3 className="font-display text-xl italic text-j-text-heading mt-8 mb-3">{children}</h3>
    ),
    blockquote: ({ children }) => (
      <blockquote className="border-l-2 border-j-accent pl-4 my-6 italic font-body text-j-text-muted leading-[1.9] font-light">
        {children}
      </blockquote>
    ),
  },
  list: {
    bullet: ({ children }) => (
      <ul className="flex flex-col gap-3 font-body text-base text-j-text leading-[1.9] font-light list-disc pl-5 mt-3">
        {children}
      </ul>
    ),
    number: ({ children }) => (
      <ol className="flex flex-col gap-3 font-body text-base text-j-text leading-[1.9] font-light list-decimal pl-5 mt-3">
        {children}
      </ol>
    ),
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
      const className = "text-j-accent hover:underline";

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
}

export function PortableTextContent({ value }: PortableTextContentProps) {
  return <PortableText value={value} components={components} />;
}
