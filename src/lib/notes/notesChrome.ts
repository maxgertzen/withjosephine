import type { NotesFooterProps, NotesNavProps } from "@/components/Notes/NotesShell";
import { mapFooterContent, mapNavContent, mapSocialLinks } from "@/lib/sanity/mappers";
import type { SanityNotesState, SanitySiteSettings } from "@/lib/sanity/types";

import { notesFooterLink, notesNavLink } from "./notes";

export function notesNav(
  siteSettings: SanitySiteSettings | null,
  state: SanityNotesState | null,
): NotesNavProps {
  return { content: mapNavContent(siteSettings), notesLink: notesNavLink(state) };
}

export function notesFooter(
  siteSettings: SanitySiteSettings | null,
  state: SanityNotesState | null,
): NotesFooterProps {
  return {
    content: mapFooterContent(siteSettings),
    socialLinks: mapSocialLinks(siteSettings),
    notesLink: notesFooterLink(state),
  };
}
