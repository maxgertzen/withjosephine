import { describe, expect, it, vi, beforeEach } from "vitest";
import { stripLeadingArticle, run, type ReadingDoc } from "./migrate-strip-title-articles-2026-06-12";

describe("stripLeadingArticle", () => {
  it("strips 'The ' prefix", () => {
    expect(stripLeadingArticle("The Soul Blueprint")).toBe("Soul Blueprint");
  });

  it("strips 'A ' prefix", () => {
    expect(stripLeadingArticle("A Reading")).toBe("Reading");
  });

  it("strips 'An ' prefix", () => {
    expect(stripLeadingArticle("An Akashic Reading")).toBe("Akashic Reading");
  });

  it("is case-insensitive", () => {
    expect(stripLeadingArticle("the Birth Chart Reading")).toBe("Birth Chart Reading");
    expect(stripLeadingArticle("THE Birth Chart Reading")).toBe("Birth Chart Reading");
  });

  it("returns null for titles without a leading article", () => {
    expect(stripLeadingArticle("Soul Blueprint")).toBeNull();
    expect(stripLeadingArticle("Birth Chart Reading")).toBeNull();
    expect(stripLeadingArticle("Akashic Record Reading")).toBeNull();
  });

  it("does not match words that merely start with an article's letters", () => {
    expect(stripLeadingArticle("Theory of Everything")).toBeNull();
    expect(stripLeadingArticle("Announcement")).toBeNull();
    expect(stripLeadingArticle("Another Reading")).toBeNull();
  });

  it("strips stacked leading articles to a fixed point", () => {
    expect(stripLeadingArticle("The The Reading")).toBe("Reading");
    expect(stripLeadingArticle("A An Reading")).toBe("Reading");
  });

  it("returns null for the empty string", () => {
    expect(stripLeadingArticle("")).toBeNull();
  });

  it("does not strip 'The' when it is the full title with no following word", () => {
    // No space after "The" means no match
    expect(stripLeadingArticle("The")).toBeNull();
  });

  it("trims extra whitespace after stripping", () => {
    expect(stripLeadingArticle("The  Soul Blueprint")).toBe("Soul Blueprint");
  });
});

const mockFetch = vi.fn();
const mockPatch = vi.fn();
const mockSet = vi.fn();
const mockCommit = vi.fn();

vi.mock("./_lib/sanity-write-client.mts", () => ({
  sanityWriteClient: () => ({
    fetch: mockFetch,
    patch: mockPatch,
  }),
}));

const READING_WITH_ARTICLE: ReadingDoc = {
  _id: "reading-1",
  name: "The Soul Blueprint",
};

const READING_CLEAN: ReadingDoc = {
  _id: "reading-2",
  name: "Birth Chart Reading",
};

const READING_A_ARTICLE: ReadingDoc = {
  _id: "reading-3",
  name: "An Akashic Record Reading",
};

beforeEach(() => {
  vi.resetAllMocks();
  mockSet.mockReturnValue({ commit: mockCommit });
  mockPatch.mockReturnValue({ set: mockSet });
  mockCommit.mockResolvedValue(undefined);
});

describe("run — dry-run (default)", () => {
  it("returns skipped for a clean title, no patch call", async () => {
    mockFetch
      .mockResolvedValueOnce([READING_CLEAN]) // readings
      .mockResolvedValueOnce(null); // emailDay7Delivery — not found

    const result = await run({ dataset: "staging", dryRun: true });

    expect(result.readings).toHaveLength(1);
    expect(result.readings[0].action).toBe("skipped");
    expect(result.readings[0].newName).toBe("Birth Chart Reading");
    expect(mockPatch).not.toHaveBeenCalled();
  });

  it("returns patched action for article title but does NOT call commit in dry-run", async () => {
    mockFetch
      .mockResolvedValueOnce([READING_WITH_ARTICLE])
      .mockResolvedValueOnce(null);

    const result = await run({ dataset: "staging", dryRun: true });

    expect(result.readings[0].action).toBe("patched");
    expect(result.readings[0].oldName).toBe("The Soul Blueprint");
    expect(result.readings[0].newName).toBe("Soul Blueprint");
    expect(mockCommit).not.toHaveBeenCalled();
  });

  it("handles multiple readings — mix of clean and article-prefixed", async () => {
    mockFetch
      .mockResolvedValueOnce([READING_WITH_ARTICLE, READING_CLEAN, READING_A_ARTICLE])
      .mockResolvedValueOnce(null);

    const result = await run({ dataset: "staging", dryRun: true });

    expect(result.readings).toHaveLength(3);
    expect(result.readings.filter((r) => r.action === "patched")).toHaveLength(2);
    expect(result.readings.filter((r) => r.action === "skipped")).toHaveLength(1);
  });

  it("day7SubjectPatched is false when no singleton", async () => {
    mockFetch
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce(null);

    const result = await run({ dataset: "staging", dryRun: true });

    expect(result.day7SubjectPatched).toBe(false);
  });

  it("day7SubjectPatched is false for clean subject — no write", async () => {
    mockFetch
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce({ _id: "day7-1", subjectTemplate: "Your {readingName} is ready" });

    const result = await run({ dataset: "staging", dryRun: true });

    expect(result.day7SubjectPatched).toBe(false);
    expect(mockCommit).not.toHaveBeenCalled();
  });

  it("day7SubjectPatched is true when double-noun subject found — but no commit in dry-run", async () => {
    mockFetch
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce({ _id: "day7-1", subjectTemplate: "Your {readingName} reading is ready" });

    const result = await run({ dataset: "staging", dryRun: true });

    expect(result.day7SubjectPatched).toBe(true);
    expect(mockCommit).not.toHaveBeenCalled();
  });
});

describe("run — apply mode (idempotency)", () => {
  it("writes stripped name to Sanity for article-prefixed reading", async () => {
    mockFetch
      .mockResolvedValueOnce([READING_WITH_ARTICLE])
      .mockResolvedValueOnce(null);

    const result = await run({ dataset: "staging", dryRun: false });

    expect(result.readings[0].action).toBe("patched");
    expect(mockPatch).toHaveBeenCalledWith("reading-1");
    expect(mockSet).toHaveBeenCalledWith({ name: "Soul Blueprint" });
    expect(mockCommit).toHaveBeenCalledTimes(1);
  });

  it("idempotent: a second run on clean titles produces zero patches", async () => {
    // Simulate that the first run already stripped the title
    const cleanAfterMigration: ReadingDoc = { _id: "reading-1", name: "Soul Blueprint" };

    mockFetch
      .mockResolvedValueOnce([cleanAfterMigration])
      .mockResolvedValueOnce(null);

    const result = await run({ dataset: "staging", dryRun: false });

    expect(result.readings[0].action).toBe("skipped");
    expect(mockCommit).not.toHaveBeenCalled();
  });

  it("patches the Day-7 double-noun subject and commits when in apply mode", async () => {
    mockFetch
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce({ _id: "day7-1", subjectTemplate: "Your {readingName} reading is ready" });

    const result = await run({ dataset: "staging", dryRun: false });

    expect(result.day7SubjectPatched).toBe(true);
    expect(mockPatch).toHaveBeenCalledWith("day7-1");
    expect(mockSet).toHaveBeenCalledWith({ subjectTemplate: "Your {readingName} is ready" });
    expect(mockCommit).toHaveBeenCalledTimes(1);
  });

  it("idempotent: re-run against already-clean Day-7 subject skips the patch", async () => {
    mockFetch
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce({ _id: "day7-1", subjectTemplate: "Your {readingName} is ready" });

    const result = await run({ dataset: "staging", dryRun: false });

    expect(result.day7SubjectPatched).toBe(false);
    expect(mockCommit).not.toHaveBeenCalled();
  });

  it("patches both article-prefixed readings AND double-noun subject in a single run", async () => {
    mockFetch
      .mockResolvedValueOnce([READING_WITH_ARTICLE])
      .mockResolvedValueOnce({ _id: "day7-1", subjectTemplate: "Your {readingName} reading is ready" });

    const result = await run({ dataset: "staging", dryRun: false });

    expect(result.readings[0].action).toBe("patched");
    expect(result.day7SubjectPatched).toBe(true);
    expect(mockCommit).toHaveBeenCalledTimes(2);
  });
});
