#!/usr/bin/env node

import { execFileSync, spawnSync } from "node:child_process";
import { appendFileSync } from "node:fs";

const LABEL = "major-updates";
const TITLE = "Major dependency updates available";
const PROJECTS = [
  { name: "website", dir: "." },
  { name: "studio", dir: "studio" },
];

const { GITHUB_OUTPUT, GITHUB_REPOSITORY_OWNER } = process.env;

function majorOf(version) {
  return Number(version.split(".")[0]);
}

function majorUpdatesIn(project) {
  const outdated = spawnSync("pnpm", ["outdated", "--format", "json"], {
    cwd: project.dir,
    encoding: "utf8",
  });
  if (outdated.status !== 0 && outdated.status !== 1) {
    throw new Error(`pnpm outdated failed in ${project.dir}: ${outdated.stderr}`);
  }
  return Object.entries(JSON.parse(outdated.stdout || "{}"))
    .filter(([, versions]) => majorOf(versions.latest) > majorOf(versions.wanted))
    .map(([name, versions]) => ({
      project: project.name,
      name,
      wanted: versions.wanted,
      latest: versions.latest,
    }));
}

function issueBody(updates) {
  const rows = updates.map(
    (update) => `| ${update.project} | \`${update.name}\` | ${update.wanted} | ${update.latest} |`,
  );
  return [
    "Dependabot skips major versions. These are upgraded by hand.",
    "This body is rewritten every week. Notes go in comments.",
    "",
    "| Project | Package | In lockfile | Latest |",
    "|---|---|---|---|",
    ...rows,
  ].join("\n");
}

function majorKey(project, name, latest) {
  return `${project} ${name} ${majorOf(latest)}`;
}

function majorKeysInBody(body) {
  const tableRow = /^\| (\S+) \| `([^`]+)` \| [^|]+ \| (\S+) \|\r?$/gm;
  return new Set([...body.matchAll(tableRow)].map(([, project, name, latest]) => majorKey(project, name, latest)));
}

function gh(args, input) {
  return execFileSync("gh", args, { encoding: "utf8", input }).trim();
}

const updates = PROJECTS.flatMap(majorUpdatesIn).sort((a, b) =>
  `${a.project} ${a.name}`.localeCompare(`${b.project} ${b.name}`),
);
const body = issueBody(updates);
const [openIssue] = JSON.parse(
  gh(["issue", "list", "--label", LABEL, "--state", "open", "--json", "number,body,url"]),
);

let newMajorsIssueUrl = "";

if (updates.length === 0) {
  if (openIssue) {
    gh(["issue", "close", String(openIssue.number), "--comment", "No major updates are pending."]);
  }
} else if (!openIssue) {
  gh(["label", "create", LABEL, "--color", "FBCA04", "--description", "Major dependency versions to upgrade by hand", "--force"]);
  newMajorsIssueUrl = gh(
    ["issue", "create", "--title", TITLE, "--label", LABEL, "--assignee", GITHUB_REPOSITORY_OWNER, "--body-file", "-"],
    body,
  );
} else if (openIssue.body.replace(/\r\n/g, "\n").trim() !== body) {
  const knownMajors = majorKeysInBody(openIssue.body);
  gh(["issue", "edit", String(openIssue.number), "--body-file", "-"], body);
  const hasNewMajor = updates.some((update) => !knownMajors.has(majorKey(update.project, update.name, update.latest)));
  if (hasNewMajor) {
    newMajorsIssueUrl = openIssue.url;
  }
}

console.log(`${updates.length} major updates pending`);
appendFileSync(GITHUB_OUTPUT, `new_majors_issue_url=${newMajorsIssueUrl}\n`);
