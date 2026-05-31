#!/usr/bin/env node

// Reads PR body + the merged commit message (squash-merge picks up the PR
// title/body verbatim) and closes any dex tasks referenced via:
//   - "Closes dex <id>"  / "Closes: dex <id>"
//   - "Closes <id>"      / "Closes: <id>"  (when the <id> matches the dex format)
//
// "Refs dex <id>" is intentionally NOT a close trigger — refs are for linking
// context without claiming the work landed.
//
// The dex id format is a 6-12 char base36 lowercase string (matches the
// pattern @zeeg/dex emits).

import { execSync } from "node:child_process";

const PR_BODY = process.env.PR_BODY ?? "";
const PR_TITLE = process.env.PR_TITLE ?? "";
const MERGE_SHA = process.env.MERGE_SHA ?? "";
const PR_NUMBER = process.env.PR_NUMBER ?? "";

if (!MERGE_SHA) {
  console.error("MERGE_SHA env var missing — skipping.");
  process.exit(0);
}

// Pull the merged commit's body too — many PRs land via squash merge with
// "Closes dex …" added in the commit body rather than the PR body.
let commitBody = "";
try {
  commitBody = execSync(`git show -s --format=%B ${MERGE_SHA}`, {
    encoding: "utf8",
  });
} catch (err) {
  console.warn(`could not read commit body for ${MERGE_SHA}: ${err.message}`);
}

const corpus = `${PR_TITLE}\n${PR_BODY}\n${commitBody}`;

// Strict patterns. The "dex" keyword is required so we don't accidentally
// close GitHub issues or other ID-shaped tokens.
const CLOSE_PATTERNS = [
  /\b(?:closes?|fixes?|resolves?):?\s+dex\s+([a-z0-9]{6,12})\b/gi,
];

const ids = new Set();
for (const re of CLOSE_PATTERNS) {
  for (const match of corpus.matchAll(re)) {
    ids.add(match[1].toLowerCase());
  }
}

if (ids.size === 0) {
  console.log(`PR #${PR_NUMBER} carried no "Closes dex <id>" markers — nothing to close.`);
  process.exit(0);
}

console.log(`PR #${PR_NUMBER} (${MERGE_SHA.slice(0, 8)}) closes ${ids.size} dex task(s):`);
for (const id of ids) console.log(`  - ${id}`);

// Load the full task set once so we can skip per-id `dex show` subprocess fan-out.
// `dex list --flat --json` is the same source the auditor uses.
const taskById = new Map();
try {
  const listOut = execSync("dex list --flat --json", { encoding: "utf8" });
  const tasks = JSON.parse(listOut);
  for (const t of tasks) taskById.set(t.id, t);
} catch (err) {
  console.warn(`could not load dex task list: ${err.message}`);
}

const failures = [];
for (const id of ids) {
  const task = taskById.get(id);
  if (!task) {
    console.warn(`  [${id}] not found in dex list — skipping.`);
    failures.push({ id, reason: "show-failed" });
    continue;
  }
  if (task.status === "completed") {
    console.log(`  [${id}] already completed — skipping.`);
    continue;
  }

  const reason = `Auto-closed by PR #${PR_NUMBER} merge (${MERGE_SHA.slice(0, 8)})`;
  try {
    execSync(
      `dex complete ${id} --result ${JSON.stringify(reason)} --commit ${MERGE_SHA} --force`,
      { stdio: "inherit" },
    );
  } catch (err) {
    console.error(`  [${id}] dex complete failed: ${err.message}`);
    failures.push({ id, reason: "complete-failed" });
  }
}

if (failures.length > 0) {
  console.error(`\n${failures.length} failure(s):`);
  for (const f of failures) console.error(`  - ${f.id}: ${f.reason}`);
  // Don't fail the workflow on partial failures — log and move on. Surfacing
  // these via the workflow log is enough for triage.
}
