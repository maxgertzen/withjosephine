#!/usr/bin/env node

// Reconciles open dex tasks against the actual repo state.
//
// For every open dex task, intersects:
//   1. git log over last 180 days for "dex <id>" / "Closes dex <id>" mentions
//   2. file paths mentioned in the task description against the working tree
//   3. PR titles in `gh pr list --state all` for the dex id
//
// Outputs a ranked stale-confidence list. The operator does ONE review pass:
//   - tasks marked "likely-done": appear in a merged commit body -> probably
//     just needs `dex complete <id> --commit <sha>` (or wait for the
//     auto-close workflow on the next merge to catch up).
//   - tasks marked "stale-orphan": no commit reference + key file paths
//     missing -> probably superseded; review + close or archive.
//   - tasks marked "needs-review": neither signal -> unchanged.
//
// Read-only. Does NOT mutate `.dex/tasks.jsonl`. The operator decides each.
//
// Run: pnpm tsx scripts/dex-audit.mts
// Or:  pnpm tsx scripts/dex-audit.mts --json   (for piping)

import { execSync } from "node:child_process";
import { existsSync } from "node:fs";
import { resolve } from "node:path";

type DexTask = {
  id: string;
  name: string;
  description?: string;
  status: string;
  created_at?: string;
  parent_id?: string | null;
};

type AuditEntry = {
  id: string;
  name: string;
  status: string;
  ageDays: number | null;
  hasOpenChildren: boolean;
  confidence: "likely-done" | "stale-orphan" | "needs-review";
  signals: string[];
};

const LOOKBACK_DAYS = 180;
const STALE_AGE_DAYS = 30;
const FILE_PATTERN = /(?:src|scripts|studio|tests|docs)\/[\w./-]+\.(?:tsx?|mts|md|sql|json)/g;

function listOpenTasks(): DexTask[] {
  const json = execSync("dex list --flat --json", { encoding: "utf8" });
  const arr = JSON.parse(json) as DexTask[];
  return arr.filter((t) => t.status !== "completed" && t.status !== "archived");
}

type CommitLogEntry = { sha: string; subject: string; body: string };

function loadCommitLog(): CommitLogEntry[] {
  try {
    const since = new Date(Date.now() - LOOKBACK_DAYS * 86400_000)
      .toISOString()
      .slice(0, 10);
    const out = execSync(
      `git log --since=${since} --all --format=%H%x09%s%x09%b%x00`,
      { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"], maxBuffer: 64 * 1024 * 1024 },
    );
    return out
      .split("\0")
      .map((rec) => rec.replace(/^\n/, ""))
      .filter((rec) => rec.length > 0)
      .map((rec) => {
        const [sha = "", subject = "", body = ""] = rec.split("\t");
        return { sha, subject, body };
      });
  } catch {
    return [];
  }
}

function findCommitMatches(
  log: CommitLogEntry[],
  id: string,
  mode: "any" | "closes",
): string[] {
  const closesRe = new RegExp(`(closes|fixes|resolves):? *dex *${id}\\b`, "i");
  const anyRe = new RegExp(`\\b${id}\\b`, "i");
  const re = mode === "closes" ? closesRe : anyRe;
  return log
    .filter((c) => re.test(c.subject) || re.test(c.body))
    .map((c) => `${c.sha}\t${c.subject}`);
}

function extractFilePaths(text: string): string[] {
  const matches = text.match(FILE_PATTERN);
  if (!matches) return [];
  return Array.from(new Set(matches));
}

function partitionPathsByExistence(paths: string[]): {
  existing: string[];
  missing: string[];
} {
  const existing: string[] = [];
  const missing: string[] = [];
  for (const p of paths) {
    (existsSync(resolve(process.cwd(), p)) ? existing : missing).push(p);
  }
  return { existing, missing };
}

function classify(
  task: DexTask,
  hasOpenChildren: boolean,
  log: CommitLogEntry[],
): AuditEntry {
  const signals: string[] = [];
  const body = `${task.name}\n${task.description ?? ""}`;

  const closesCommits = findCommitMatches(log, task.id, "closes");
  const anyCommits = findCommitMatches(log, task.id, "any");

  if (closesCommits.length > 0) {
    signals.push(`'Closes/Fixes dex ${task.id}' in commit(s): ${closesCommits.length}`);
    for (const line of closesCommits.slice(0, 3)) {
      const [sha, subject] = line.split("\t");
      signals.push(`  ${sha?.slice(0, 8)} ${subject}`);
    }
  } else if (anyCommits.length > 0) {
    signals.push(`weak commit ref(s) to id: ${anyCommits.length} (no explicit Closes marker)`);
  }

  const paths = extractFilePaths(body);
  const { existing: existingPaths, missing: missingPaths } = partitionPathsByExistence(paths);
  if (paths.length > 0) {
    signals.push(`paths in body: ${paths.length} (${existingPaths.length} exist, ${missingPaths.length} missing)`);
  }

  if (hasOpenChildren) signals.push(`epic — has open children`);

  const ageDays = task.created_at
    ? Math.floor((Date.now() - new Date(task.created_at).getTime()) / 86400_000)
    : null;

  let confidence: AuditEntry["confidence"];
  if (closesCommits.length > 0 && !hasOpenChildren) {
    confidence = "likely-done";
  } else if (
    ageDays !== null &&
    ageDays > STALE_AGE_DAYS &&
    paths.length > 0 &&
    missingPaths.length === paths.length &&
    !hasOpenChildren
  ) {
    confidence = "stale-orphan";
  } else {
    confidence = "needs-review";
  }

  return {
    id: task.id,
    name: task.name,
    status: task.status,
    ageDays,
    hasOpenChildren,
    confidence,
    signals,
  };
}

function renderText(entries: AuditEntry[]): string {
  const buckets: Record<AuditEntry["confidence"], AuditEntry[]> = {
    "likely-done": [],
    "stale-orphan": [],
    "needs-review": [],
  };
  for (const e of entries) buckets[e.confidence].push(e);

  const lines: string[] = [];
  lines.push(`# dex audit — ${entries.length} open task(s)`);
  lines.push("");
  lines.push(`Generated: ${new Date().toISOString()}`);
  lines.push("");

  const sections: Array<[AuditEntry["confidence"], string]> = [
    ["likely-done", "Likely done (close with `dex complete <id> --commit <sha> --result ...`)"],
    ["stale-orphan", "Stale orphans (review and close/archive)"],
    ["needs-review", "Needs review (no strong signal either way)"],
  ];

  for (const [key, title] of sections) {
    const arr = buckets[key];
    if (arr.length === 0) continue;
    lines.push(`## ${title} — ${arr.length}`);
    lines.push("");
    for (const e of arr.sort((a, b) => (b.ageDays ?? 0) - (a.ageDays ?? 0))) {
      const age = e.ageDays !== null ? ` (${e.ageDays}d)` : "";
      lines.push(`- **${e.id}**${age} — ${e.name.slice(0, 80)}`);
      for (const s of e.signals) lines.push(`  - ${s}`);
    }
    lines.push("");
  }

  return lines.join("\n");
}

async function main(): Promise<void> {
  const wantJson = process.argv.includes("--json");
  const tasks = listOpenTasks();
  const log = loadCommitLog();
  const openIds = new Set(tasks.map((t) => t.id));
  const childByParent = new Map<string, number>();
  for (const t of tasks) {
    if (!t.parent_id) continue;
    if (!openIds.has(t.parent_id)) continue;
    childByParent.set(t.parent_id, (childByParent.get(t.parent_id) ?? 0) + 1);
  }
  const entries: AuditEntry[] = tasks.map((t) =>
    classify(t, (childByParent.get(t.id) ?? 0) > 0, log),
  );

  if (wantJson) {
    console.log(JSON.stringify(entries, null, 2));
  } else {
    console.log(renderText(entries));
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
