import { deriveNoteViewProps } from "@/app/notes/[slug]/deriveNoteViewProps";
import {
  NOTE_SUMMARIES,
  PILLAR_ARTICLE,
  VISIBLE_NOTES_STATE,
} from "@/app/notes/[slug]/noteFixtures";
import type { NoteViewProps } from "@/app/notes/[slug]/NoteView";
import { deriveNotesIndexViewProps } from "@/app/notes/deriveNotesIndexViewProps";
import type { NotesIndexViewProps } from "@/app/notes/NotesIndexView";

export { PILLAR_PLATE } from "@/app/notes/[slug]/noteFixtures";

export const NOTE_PILLAR_ARGS: NoteViewProps = deriveNoteViewProps({
  article: PILLAR_ARTICLE,
  notesState: VISIBLE_NOTES_STATE,
  siteSettings: null,
});

export const NOTES_INDEX_ARGS: NotesIndexViewProps = deriveNotesIndexViewProps({
  notesState: VISIBLE_NOTES_STATE,
  articles: NOTE_SUMMARIES,
  siteSettings: null,
});
