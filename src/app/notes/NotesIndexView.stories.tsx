import { NOTES_INDEX_ARGS } from "@story-fixtures/pages/notes";
import type { Meta, StoryObj } from "@storybook/react";

import { NotesIndexView } from "./NotesIndexView";

const meta: Meta<typeof NotesIndexView> = {
  title: "Pages/Notes",
  component: NotesIndexView,
  parameters: { layout: "fullscreen" },
  args: NOTES_INDEX_ARGS,
};
export default meta;

type Story = StoryObj<typeof NotesIndexView>;

export const ThreeNotes: Story = {};

export const OneNote: Story = { args: { notes: NOTES_INDEX_ARGS.notes.slice(0, 1) } };
