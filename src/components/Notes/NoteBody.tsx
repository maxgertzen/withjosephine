import {
  PortableText,
  type PortableTextComponents,
  type PortableTextMarkComponentProps,
} from "@portabletext/react";
import Image from "next/image";
import Link from "next/link";

import { notePath } from "@/lib/notes/notes";
import type {
  LinkMark,
  NoteBodyBlock,
  NoteImageValue,
  NoteLinkMark,
  NotePlateValue,
} from "@/lib/notes/types";
import { sanityImageUrl } from "@/lib/sanity/imageUrl";
import { goldLinkClasses } from "@/lib/textStyles";

import { NotePlate } from "./NotePlate";

const PARAGRAPH = "mt-5 font-body text-[1.0625rem] leading-[1.75] text-j-text [text-wrap:pretty]";
const OPENING = "mt-7 font-body text-lg leading-[1.7] text-j-text [text-wrap:pretty]";
const LIST = "mt-5 flex flex-col gap-2 pl-5 font-body text-[1.0625rem] leading-[1.75] text-j-text";
const BOOK_PATH = /^\/book\/([^/?#]+)/;
const WEB_URL = /^https?:/;
const BODY_IMAGE_PX = 1080;

function trackingFor(href: string, noteSlug: string): Record<string, string> {
  const reading = BOOK_PATH.exec(href)?.[1];
  if (!reading) return {};
  return {
    "data-mp-event": "article_reading_click",
    "data-mp-note": noteSlug,
    "data-mp-reading-id": reading,
    "data-mp-position": "inline",
  };
}

function bodyComponents(noteSlug: string): PortableTextComponents {
  return {
    block: {
      normal: ({ children, index }) => (
        <p className={index === 0 ? OPENING : PARAGRAPH}>{children}</p>
      ),
      h2: ({ children }) => (
        <h2 className="mt-10 mb-3 font-display font-medium text-[1.625rem] leading-[1.2] text-j-text-heading [text-wrap:balance] [&+p]:mt-0">
          {children}
        </h2>
      ),
      h3: ({ children }) => (
        <h3 className="mt-8 mb-2 font-display italic font-semibold text-[1.375rem] leading-[1.25] text-j-text-heading [text-wrap:balance] [&+p]:mt-0">
          {children}
        </h3>
      ),
      blockquote: ({ children }) => (
        <blockquote className="my-8 border-l-2 border-j-border-gold pl-4 font-display italic text-[1.625rem] leading-[1.35] text-j-text">
          {children}
        </blockquote>
      ),
    },
    list: {
      bullet: ({ children }) => <ul className={`${LIST} list-disc`}>{children}</ul>,
      number: ({ children }) => <ol className={`${LIST} list-decimal`}>{children}</ol>,
    },
    marks: {
      strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
      link: ({ value, children }: PortableTextMarkComponentProps<LinkMark>) => {
        const href = value?.href ?? "";
        if (href.startsWith("/")) {
          return (
            <Link href={href} className={goldLinkClasses} {...trackingFor(href, noteSlug)}>
              {children}
            </Link>
          );
        }
        if (href.startsWith("mailto:")) {
          return (
            <a href={href} className={goldLinkClasses}>
              {children}
            </a>
          );
        }
        if (!WEB_URL.test(href)) return <>{children}</>;
        return (
          <a href={href} className={goldLinkClasses} target="_blank" rel="noopener noreferrer">
            {children}
          </a>
        );
      },
      noteLink: ({ value, children }: PortableTextMarkComponentProps<NoteLinkMark>) =>
        value?.slug ? (
          <Link
            href={notePath(value.slug)}
            className={goldLinkClasses}
            data-mp-event="article_note_click"
            data-mp-note={noteSlug}
            data-mp-target={value.slug}
            data-mp-position="inline"
          >
            {children}
          </Link>
        ) : (
          <>{children}</>
        ),
    },
    types: {
      notePlate: ({ value }: { value: NotePlateValue }) => <NotePlate plate={value} />,
      image: ({ value }: { value: NoteImageValue }) =>
        value.url ? (
          <figure className="my-8">
            <Image
              src={sanityImageUrl(value.url, { w: BODY_IMAGE_PX, fit: "max" })}
              alt={value.alt ?? ""}
              width={value.width ?? BODY_IMAGE_PX}
              height={value.height ?? BODY_IMAGE_PX}
              sizes="(min-width: 640px) 36rem, 100vw"
              className="h-auto w-full rounded-[16px]"
            />
            {value.caption ? (
              <figcaption className="mt-2 font-body text-sm text-j-text-muted">
                {value.caption}
              </figcaption>
            ) : null}
          </figure>
        ) : null,
    },
  };
}

export function NoteBody({ blocks, noteSlug }: { blocks: NoteBodyBlock[]; noteSlug: string }) {
  return <PortableText value={blocks} components={bodyComponents(noteSlug)} />;
}
