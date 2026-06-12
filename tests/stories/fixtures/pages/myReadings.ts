import type { LibraryViewState } from "@/app/(authed)/my-readings/_shared/LibraryView";
import { MY_READINGS_FIXTURES } from "@/lib/page-previews/preview-fixtures-pages";

export const LIBRARY_VIEW_LIST_STATE = MY_READINGS_FIXTURES["list-populated"];

export const LIBRARY_VIEW_SIGN_IN_STATE = MY_READINGS_FIXTURES.signIn;

const populated = MY_READINGS_FIXTURES["list-populated"];

export const LIBRARY_VIEW_SINGLE_READING_STATE: LibraryViewState =
  populated.kind === "list"
    ? { kind: "list", readings: populated.readings.slice(0, 1), gifts: [] }
    : populated;
