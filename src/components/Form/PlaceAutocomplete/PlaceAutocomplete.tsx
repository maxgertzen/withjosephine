"use client";

import { useEffect, useId, useRef, useState } from "react";

import { FieldShell } from "@/components/Form/FieldShell";
import { inputClasses } from "@/lib/formStyles";
import { type CityMatch, searchCities } from "@/lib/places/cities";
import type { SanityFormHelperPosition } from "@/lib/sanity/types";

type PlaceAutocompleteProps = {
  id: string;
  name: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  onGeonameIdChange?: (geonameid: number | null) => void;
  helpText?: string;
  helperPosition?: SanityFormHelperPosition;
  clarificationNote?: string;
  placeholder?: string;
  error?: string;
  required?: boolean;
  disabled?: boolean;
};

export function PlaceAutocomplete({
  id,
  name,
  label,
  value,
  onChange,
  onGeonameIdChange,
  helpText,
  helperPosition,
  clarificationNote,
  placeholder = " ",
  error,
  required,
  disabled,
}: PlaceAutocompleteProps) {
  const listboxId = useId();
  const inputRef = useRef<HTMLInputElement | null>(null);
  const wrapperRef = useRef<HTMLDivElement | null>(null);

  const [open, setOpen] = useState(false);
  const [matches, setMatches] = useState<CityMatch[]>([]);
  const [active, setActive] = useState(0);
  const [searched, setSearched] = useState(false);

  useEffect(() => {
    if (!open) return;
    const trimmed = value.trim();
    if (trimmed.length < 2) return;

    let cancelled = false;
    const handle = setTimeout(async () => {
      try {
        const results = await searchCities(trimmed);
        if (cancelled) return;
        setMatches(results);
        setActive(0);
        setSearched(true);
      } catch {
        if (cancelled) return;
        setMatches([]);
        setSearched(true);
      }
    }, 120);
    return () => {
      cancelled = true;
      clearTimeout(handle);
    };
  }, [value, open]);

  const trimmedValue = value.trim();
  const showMatches = open && trimmedValue.length >= 2 && matches.length > 0;
  const showEmptyHint = open && trimmedValue.length >= 2 && matches.length === 0 && searched;

  useEffect(() => {
    function onDocClick(event: MouseEvent) {
      if (!wrapperRef.current) return;
      if (!wrapperRef.current.contains(event.target as Node)) setOpen(false);
    }
    if (!open) return;
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, [open]);

  function commit(match: CityMatch) {
    onChange(match.display);
    onGeonameIdChange?.(match.geonameid);
    setOpen(false);
    inputRef.current?.blur();
  }

  function handleKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (!showMatches) {
      if (event.key === "ArrowDown" && matches.length > 0) {
        event.preventDefault();
        setOpen(true);
      }
      return;
    }
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActive((index) => (index + 1) % matches.length);
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setActive((index) => (index - 1 + matches.length) % matches.length);
    } else if (event.key === "Enter") {
      event.preventDefault();
      commit(matches[active]);
    } else if (event.key === "Escape") {
      setOpen(false);
    }
  }

  return (
    <FieldShell
      id={id}
      label={label}
      required={required}
      helpText={helpText}
      helperPosition={helperPosition}
      clarificationNote={clarificationNote}
      error={error}
    >
      <div ref={wrapperRef} className="relative">
        <input
          ref={inputRef}
          id={id}
          name={name}
          type="text"
          value={value}
          onChange={(event) => {
            onChange(event.target.value);
            onGeonameIdChange?.(null);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder ?? " "}
          disabled={disabled}
          required={required}
          autoComplete="off"
          inputMode="text"
          autoCapitalize="words"
          spellCheck={false}
          enterKeyHint="search"
          aria-autocomplete="list"
          aria-controls={listboxId}
          aria-expanded={showMatches}
          aria-activedescendant={
            showMatches && matches[active] ? `${listboxId}-option-${active}` : undefined
          }
          aria-invalid={error ? true : undefined}
          role="combobox"
          className={inputClasses}
        />
        {showMatches ? (
          <ul
            id={listboxId}
            role="listbox"
            className="absolute left-0 right-0 top-full mt-1 z-10 bg-j-ivory border border-j-border-gold rounded-md shadow-j-soft max-h-64 overflow-y-auto"
          >
            {matches.map((match, index) => (
              <li
                key={match.geonameid}
                id={`${listboxId}-option-${index}`}
                role="option"
                aria-selected={index === active}
                onMouseEnter={() => setActive(index)}
                onMouseDown={(event) => {
                  event.preventDefault();
                  commit(match);
                }}
                className={`px-4 py-2 cursor-pointer font-body text-base ${
                  index === active
                    ? "bg-j-blush/40 text-j-text-heading"
                    : "text-j-text"
                }`}
              >
                {match.display}
              </li>
            ))}
          </ul>
        ) : null}
        {showEmptyHint ? (
          <p
            role="status"
            className="absolute left-0 right-0 top-full mt-1 z-10 bg-j-ivory border border-j-border-subtle rounded-md px-4 py-3 font-display italic text-sm text-j-text-muted shadow-j-soft"
          >
            Can&rsquo;t find your town?
          </p>
        ) : null}
      </div>
    </FieldShell>
  );
}
