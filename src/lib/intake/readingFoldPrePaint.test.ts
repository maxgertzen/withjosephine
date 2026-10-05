import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { DRAFT_TTL_MS, DRAFT_VERSION, restore, save } from "./localStorageDraft";
import { PRE_PAINT_FOLD_ATTRIBUTE, readingFoldPrePaintScript } from "./readingFoldPrePaint";

function runScript(slug: string) {
  new Function(readingFoldPrePaintScript(slug))();
}

function marked() {
  return document.body.hasAttribute(PRE_PAINT_FOLD_ATTRIBUTE);
}

function expectAgreesWithRestore(slug: string) {
  expect(marked()).toBe(restore(slug) !== null);
}

beforeEach(() => {
  localStorage.clear();
  document.body.removeAttribute(PRE_PAINT_FOLD_ATTRIBUTE);
});

afterEach(() => {
  localStorage.clear();
});

describe("readingFoldPrePaintScript", () => {
  it("marks the page when this reading has a saved draft", () => {
    save("soul-blueprint", { currentPage: 1, values: { name: "Ada" } });

    runScript("soul-blueprint");

    expect(marked()).toBe(true);
    expectAgreesWithRestore("soul-blueprint");
  });

  it("leaves the page unmarked for a draft of another reading", () => {
    save("birth-chart", { currentPage: 1, values: {} });

    runScript("soul-blueprint");

    expect(marked()).toBe(false);
    expectAgreesWithRestore("soul-blueprint");
  });

  it("leaves the page unmarked for a draft past its idle cutoff", () => {
    localStorage.setItem(
      "josephine.intake.draft.soul-blueprint",
      JSON.stringify({
        version: DRAFT_VERSION,
        savedAt: new Date(Date.now() - DRAFT_TTL_MS - 1000).toISOString(),
        currentPage: 0,
        values: {},
      }),
    );

    runScript("soul-blueprint");

    expect(marked()).toBe(false);
    expectAgreesWithRestore("soul-blueprint");
  });

  it("leaves the page unmarked for a draft with the wrong shape", () => {
    localStorage.setItem(
      "josephine.intake.draft.soul-blueprint",
      JSON.stringify({ version: DRAFT_VERSION, savedAt: new Date().toISOString(), values: null }),
    );

    runScript("soul-blueprint");

    expect(marked()).toBe(false);
    expectAgreesWithRestore("soul-blueprint");
  });

  it("leaves the page unmarked for an unreadable draft", () => {
    localStorage.setItem("josephine.intake.draft.soul-blueprint", "{not json");

    runScript("soul-blueprint");

    expect(marked()).toBe(false);
    expectAgreesWithRestore("soul-blueprint");
  });
});
