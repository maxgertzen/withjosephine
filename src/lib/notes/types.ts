import type { PortableTextBlock } from "@portabletext/types";

export type NotePlateValue = {
  _type: "notePlate";
  _key?: string;
  label: string;
  layout?: "stacked" | "sideBySide";
  leftHeading?: string;
  leftLines?: string[];
  rightHeading?: string;
  rightLines?: string[];
};

export type NoteImageValue = {
  _type: "image";
  _key?: string;
  url?: string;
  width?: number;
  height?: number;
  alt?: string;
  caption?: string;
};

export type NoteBodyBlock = PortableTextBlock | NotePlateValue | NoteImageValue;

export type NoteLinkMark = { _type: "noteLink"; _key: string; slug?: string };

export type LinkMark = { _type: "link"; _key: string; href?: string };

export type NoteSummary = { title: string; slug: string };
