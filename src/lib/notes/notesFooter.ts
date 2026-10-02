import type { NotesFooterProps } from "@/components/Notes/NotesShell";
import { mapFooterContent, mapSocialLinks } from "@/lib/sanity/mappers";
import type { SanityNotesState, SanitySiteSettings } from "@/lib/sanity/types";

import { notesFooterLink } from "./notes";

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
