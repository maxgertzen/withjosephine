import { NOTE_PILLAR_ARGS } from "@story-fixtures/pages/notes";
import type { Meta, StoryObj } from "@storybook/react";

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
      ...NOTE_PILLAR_ARGS.moreNotes,
      notes: NOTE_PILLAR_ARGS.moreNotes.notes.slice(0, 1),
      seeAll: "See all notes",
    },
  },
};

export const NoReadingCard: Story = { args: { ending: undefined } };
