import { NOTE_PILLAR_ARGS } from "@story-fixtures/pages/notes";
import type { Meta, StoryObj } from "@storybook/react";

import { NOTES_DEFAULTS } from "@/data/defaults";

import { NoteView } from "./NoteView";

const meta: Meta<typeof NoteView> = {
  title: "Pages/Note",
  component: NoteView,
  parameters: { layout: "fullscreen" },
  args: NOTE_PILLAR_ARGS,
};
export default meta;

type Story = StoryObj<typeof NoteView>;

export const Pillar: Story = {};

export const WithRecording: Story = {
  args: { listen: { src: "/audio/sample.mp3", label: "Listen to this note", length: "6 min" } },
};

export const OneMoreNoteAndSeeAll: Story = {
  args: {
    moreNotes: {
      label: NOTES_DEFAULTS.moreNotesLabel,
      notes: NOTE_PILLAR_ARGS.moreNotes?.notes.slice(0, 1) ?? [],
      seeAll: "See all notes",
    },
  },
};

export const NoReadingCard: Story = { args: { ending: undefined } };

export const NoLineAboveTheReadingBox: Story = {
  args: { ending: NOTE_PILLAR_ARGS.ending && { ...NOTE_PILLAR_ARGS.ending, leadIn: undefined } },
};

export const EndingHidden: Story = { args: { ending: undefined, moreNotes: undefined } };

export const NoAuthorPhoto: Story = {
  args: { author: { ...NOTE_PILLAR_ARGS.author, photoUrl: undefined } },
};
