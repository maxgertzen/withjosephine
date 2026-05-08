"use client";

import type { ReactNode } from "react";
import { useMemo } from "react";

import {
  COMPANION_SUFFIX_GEONAMEID,
  COMPANION_SUFFIX_UNKNOWN,
  PHOTO_PUBLIC_URL_BASE,
} from "@/lib/booking/constants";
import type { IntakePage } from "@/lib/booking/derivePages";
import { TIME_UNKNOWN_SENTINEL } from "@/lib/booking/submissionSchema";
import type { SanityFormField } from "@/lib/sanity/types";

import type { FieldValues } from "./types";

type ReviewSummaryProps = {
  pages: IntakePage[];
  values: FieldValues;
  currentPageIndex: number;
  onEdit: (pageIndex: number) => void;
};

const EMPTY_VALUE = "—";

function formatDate(iso: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (!match) return iso;
  const [, year, month, day] = match;
  // Component-wise instantiation avoids the UTC-shift bug where
  // `new Date("1995-05-08")` renders "May 7" in negative-offset zones.
  const date = new Date(Number(year), Number(month) - 1, Number(day));
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

function renderFieldValue(field: SanityFormField, values: FieldValues): ReactNode {
  const raw = values[field.key];

  switch (field.type) {
    case "select": {
      if (typeof raw !== "string" || raw === "") return EMPTY_VALUE;
      const option = field.options?.find((o) => o.value === raw);
      return option?.label ?? raw;
    }
    case "multiSelectExact": {
      if (!Array.isArray(raw) || raw.length === 0) return EMPTY_VALUE;
      return (
        <ul className="list-disc list-inside flex flex-col gap-1 marker:text-j-accent">
          {raw.map((v) => (
            <li key={v}>{field.options?.find((o) => o.value === v)?.label ?? v}</li>
          ))}
        </ul>
      );
    }
    case "date": {
      if (typeof raw !== "string" || raw === "") return EMPTY_VALUE;
      return formatDate(raw);
    }
    case "time": {
      if (values[`${field.key}${COMPANION_SUFFIX_UNKNOWN}`] === true) return "Time unknown";
      if (typeof raw !== "string" || raw === "" || raw === TIME_UNKNOWN_SENTINEL) {
        return EMPTY_VALUE;
      }
      return raw;
    }
    case "fileUpload": {
      if (typeof raw !== "string" || raw === "") return EMPTY_VALUE;
      // `raw` is the R2 object key (e.g. `submissions/abc/photo.jpg`), not a
      // full URL — same convention as <FileUpload>'s saved-state preview.
      const src = `${PHOTO_PUBLIC_URL_BASE}/${raw}`;
      return (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={src}
          alt={`${field.label} preview`}
          className="h-20 w-20 rounded-lg object-cover border border-j-border-subtle"
        />
      );
    }
    default: {
      // shortText / longText / email / placeAutocomplete
      if (typeof raw !== "string" || raw === "") return EMPTY_VALUE;
      return raw;
    }
  }
}

const COMPANION_SUFFIXES = [COMPANION_SUFFIX_UNKNOWN, COMPANION_SUFFIX_GEONAMEID] as const;

function isCompanionKey(key: string, baseKeys: Set<string>): boolean {
  for (const suffix of COMPANION_SUFFIXES) {
    if (key.endsWith(suffix) && baseKeys.has(key.slice(0, -suffix.length))) {
      return true;
    }
  }
  return false;
}

type ReviewCard = {
  pageIndex: number;
  sectionId: string;
  sectionTitle: string;
  marginaliaLabel?: string;
  fields: SanityFormField[];
};

function buildCards(pages: IntakePage[], upToPageIndex: number): ReviewCard[] {
  const baseKeys = new Set(
    pages.flatMap((page) => page.flatMap((s) => s.fields.map((f) => f.key))),
  );
  const cards: ReviewCard[] = [];
  for (let pageIndex = 0; pageIndex < upToPageIndex; pageIndex += 1) {
    const page = pages[pageIndex];
    if (!page) continue;
    for (const section of page) {
      const renderable = section.fields.filter((field) => {
        if (field.type === "consent") return false;
        if (isCompanionKey(field.key, baseKeys)) return false;
        return true;
      });
      if (renderable.length === 0) continue;
      cards.push({
        pageIndex,
        sectionId: section._id,
        sectionTitle: section.sectionTitle,
        marginaliaLabel: section.marginaliaLabel,
        fields: renderable,
      });
    }
  }
  return cards;
}

export function ReviewSummary({
  pages,
  values,
  currentPageIndex,
  onEdit,
}: ReviewSummaryProps): React.ReactElement | null {
  const totalPages = pages.length;
  const cards = useMemo(
    () => buildCards(pages, currentPageIndex),
    [pages, currentPageIndex],
  );
  if (currentPageIndex !== totalPages - 1) return null;
  if (currentPageIndex === 0) return null;
  if (cards.length === 0) return null;

  return (
    <section
      aria-label="Review your answers"
      data-testid="review-summary"
      className="flex flex-col gap-4"
    >
      <div>
        <h2 className="font-display italic text-xl text-j-text-heading">
          Review your answers
        </h2>
        <p className="font-body text-sm text-j-text-muted mt-1">
          Look over what you shared. Use Edit to adjust any section before continuing to payment.
        </p>
      </div>

      {cards.map((card) => (
        <article
          key={card.sectionId}
          className="bg-j-warm/40 border border-j-border-subtle rounded-2xl p-6 flex flex-col gap-4"
        >
          <header className="flex items-start justify-between gap-4">
            <div>
              {card.marginaliaLabel ? (
                <p className="font-display italic text-xs text-j-text-muted mb-1">
                  {card.marginaliaLabel}
                </p>
              ) : null}
              <h3 className="font-display italic text-lg text-j-text-heading">
                {card.sectionTitle}
              </h3>
            </div>
            <button
              type="button"
              onClick={() => onEdit(card.pageIndex)}
              className="font-body text-sm text-j-accent underline-offset-4 hover:underline focus-visible:underline shrink-0 cursor-pointer"
              aria-label={`Edit ${card.sectionTitle}`}
            >
              Edit
            </button>
          </header>

          <dl className="grid grid-cols-1 md:grid-cols-[160px_1fr] gap-x-5 gap-y-3">
            {card.fields.map((field) => (
              <div key={field._id} className="contents">
                <dt className="font-body text-xs uppercase tracking-wide text-j-text-muted">
                  {field.label}
                </dt>
                <dd className="font-body text-sm text-j-text-body whitespace-pre-line break-words">
                  {renderFieldValue(field, values)}
                </dd>
              </div>
            ))}
          </dl>
        </article>
      ))}
    </section>
  );
}
