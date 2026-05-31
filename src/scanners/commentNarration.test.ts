import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";

import { describe, expect, it } from "vitest";

const ROOT = join(process.cwd(), "src");
const SCAN_EXT = [".ts", ".tsx"];
const SKIP_FILE_PATTERNS = [/\.test\.tsx?$/, /\.stories\.tsx?$/];
const SKIP_DIRS = new Set(["node_modules", ".generated", ".next", "scanners"]);

type Pattern = { id: string; re: RegExp; reason: string };

const PATTERNS: Pattern[] = [
  {
    id: "phase",
    re: /\bPhase \d+\b/,
    reason:
      "'Phase N' inside source comment. Phase numbers belong in PRDs and dex epics, not source — they rot when phases close. Remove the phase reference; describe the constraint plainly.",
  },
  {
    id: "dex-id",
    re: /\bdex [a-z0-9]{6,}\b/,
    reason:
      "Dex task id inside source comment. Task ids rot when tasks close. Move the rationale to docs/DECISIONS.local.md (gitignored) or the commit message.",
  },
  {
    id: "epic-id",
    re: /\bepic [a-z0-9]{6,}\b/,
    reason:
      "Epic id inside source comment. Same rationale as 'dex-id' — epic refs rot.",
  },
  {
    id: "date-prefix",
    re: /^\s*\/\/\s+\d{4}-\d{2}-\d{2}\b/,
    reason:
      "Date prefix on a source comment ('// 2026-MM-DD — …'). Git blame + commit log are authoritative. Move the dated note to the commit message; leave the comment describing the constraint, not when it was added.",
  },
];

type Violation = {
  file: string;
  line: number;
  patternId: string;
  reason: string;
  preview: string;
};

function walk(dir: string, acc: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      if (SKIP_DIRS.has(entry)) continue;
      walk(full, acc);
    } else {
      if (!SCAN_EXT.some((ext) => entry.endsWith(ext))) continue;
      if (SKIP_FILE_PATTERNS.some((re) => re.test(entry))) continue;
      acc.push(full);
    }
  }
  return acc;
}

function isCommentLine(line: string): boolean {
  return line.trim().startsWith("//");
}

function scanFile(file: string): Violation[] {
  const body = readFileSync(file, "utf8");
  const lines = body.split("\n");
  const violations: Violation[] = [];

  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i];
    if (!isCommentLine(line)) continue;
    for (const { id, re, reason } of PATTERNS) {
      if (re.test(line)) {
        violations.push({
          file,
          line: i + 1,
          patternId: id,
          reason,
          preview: line.trim().slice(0, 120),
        });
      }
    }
  }
  return violations;
}

describe("comment-narration scanner (src/)", () => {
  it("source comments don't carry Phase / dex-id / epic-id / date-prefix narration", () => {
    const files = walk(ROOT);
    const violations: Violation[] = [];
    for (const file of files) violations.push(...scanFile(file));

    const summary = violations
      .map((v) => {
        const rel = relative(process.cwd(), v.file);
        return `  ${rel}:${v.line}  [${v.patternId}]\n    ${v.preview}\n    → ${v.reason}`;
      })
      .join("\n\n");

    expect(
      violations,
      `Comment-narration violations (recurrence-prevention for feedback_comments_over_logged):\n\n${summary}\n\nFix: remove the narrative reference, or move the rationale to docs/DECISIONS.local.md / commit message.`,
    ).toEqual([]);
  });
});
