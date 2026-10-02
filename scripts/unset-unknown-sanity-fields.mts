#!/usr/bin/env tsx

import { execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { loadDotenv } from "./_lib/loadDotenv.mts";
import { isMainModule } from "./_lib/main.mts";
import { sanityWriteClient } from "./_lib/sanity-write-client.mts";

const LOG_PREFIX = "unset-unknown-sanity-fields";
const STUDIO_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../studio");
const CUSTOMER_RECORD_TYPES = ["submission"];
const FIELD_NAME = /^[A-Za-z_$][\w$]*$/;
const SANITY_KEY = /^[\w-]+$/;

type Attributes = Record<string, { type: "objectAttribute"; value: TypeNode; optional?: boolean }>;

type TypeNode =
  | { type: "object"; attributes: Attributes; rest?: TypeNode }
  | { type: "array"; of: TypeNode }
  | { type: "union"; of: TypeNode[] }
  | { type: "inline"; name: string }
  | { type: "string"; value?: string }
  | { type: "number" | "boolean" | "null" | "unknown" };

export type SchemaEntry =
  | { type: "document"; name: string; attributes: Attributes }
  | { type: "type"; name: string; value: TypeNode };

type ObjectNode = Extract<TypeNode, { type: "object" }>;
type SanityDoc = { _id: string; _type: string; _rev: string } & Record<string, unknown>;

const log = (message: string) => console.log(`[${LOG_PREFIX}] ${message}`);

const isPlainObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

export function findUnknownFieldPaths(schema: readonly SchemaEntry[], doc: SanityDoc): string[] | null {
  const byName = new Map(schema.map((entry) => [entry.name, entry]));
  if (byName.get(doc._type)?.type !== "document") return null;

  const resolve = (node: TypeNode | undefined): TypeNode | undefined => {
    if (node?.type !== "inline") return node;
    const named = byName.get(node.name);
    if (!named) return undefined;
    return named.type === "document" ? { type: "object", attributes: named.attributes } : resolve(named.value);
  };

  const attributesOf = (node: ObjectNode): Attributes => {
    const rest = resolve(node.rest);
    return rest?.type === "object" ? { ...attributesOf(rest), ...node.attributes } : node.attributes;
  };

  const declaresType = (node: ObjectNode, value: Record<string, unknown>): boolean => {
    const typeNode = attributesOf(node)._type?.value;
    if (typeNode?.type !== "string" || typeNode.value === undefined || value._type === undefined) return true;
    return typeNode.value === value._type;
  };

  const pickUnionMember = (members: TypeNode[], value: Record<string, unknown>): ObjectNode | undefined =>
    members
      .map(resolve)
      .find((member): member is ObjectNode => member?.type === "object" && declaresType(member, value));

  const addressable = (segment: string, pattern: RegExp, at: string): string => {
    if (!pattern.test(segment)) throw new Error(`${doc._id}: cannot build an unset path for "${segment}" at "${at}"`);
    return segment;
  };

  const unknown: string[] = [];

  const walk = (node: TypeNode | undefined, value: unknown, at: string): void => {
    const resolved = resolve(node);
    if (!resolved) return;

    if (resolved.type === "array" && Array.isArray(value)) {
      value.forEach((item, index) => {
        const segment =
          isPlainObject(item) && typeof item._key === "string"
            ? `[_key=="${addressable(item._key, SANITY_KEY, at)}"]`
            : `[${index}]`;
        walk(resolved.of, item, `${at}${segment}`);
      });
      return;
    }

    if (!isPlainObject(value)) return;

    const objectNode = resolved.type === "union" ? pickUnionMember(resolved.of, value) : resolved;
    if (objectNode?.type !== "object" || !declaresType(objectNode, value)) return;

    const attributes = attributesOf(objectNode);
    for (const [key, child] of Object.entries(value)) {
      if (key.startsWith("_")) continue;
      const fieldPath = at ? `${at}.${addressable(key, FIELD_NAME, at)}` : addressable(key, FIELD_NAME, at);
      if (attributes[key]) walk(attributes[key].value, child, fieldPath);
      else unknown.push(fieldPath);
    }
  };

  walk({ type: "inline", name: doc._type }, doc, "");
  return unknown;
}

function extractSchema(workspace: string): SchemaEntry[] {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), `${LOG_PREFIX}-`));
  const schemaFile = path.join(dir, "schema.json");
  try {
    execFileSync(
      "pnpm",
      ["exec", "sanity", "schema", "extract", "--workspace", workspace, "--path", path.relative(STUDIO_DIR, schemaFile)],
      { cwd: STUDIO_DIR, stdio: "pipe" },
    );
    return JSON.parse(fs.readFileSync(schemaFile, "utf-8")) as SchemaEntry[];
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
}

const git = (args: string[]) => execFileSync("git", args, { cwd: STUDIO_DIR, encoding: "utf-8" }).trim();

function headIsOnOriginMain(): boolean {
  try {
    git(["merge-base", "--is-ancestor", "HEAD", "origin/main"]);
    return true;
  } catch {
    return false;
  }
}

function assertSchemaIsDeployedToProduction(): void {
  const studioChanges = git(["status", "--porcelain", "--", "."]);
  if (!headIsOnOriginMain() || studioChanges) {
    throw new Error(
      "production needs the schema production runs: check out a commit on origin/main with no local studio/ changes",
    );
  }
}

function datasetClient(dataset: string, apply: boolean) {
  const client = apply
    ? sanityWriteClient({ dataset })
    : sanityWriteClient({ dataset, readOnly: true }).withConfig({ token: process.env.SANITY_READ_TOKEN });
  return client.withConfig({ perspective: "raw" });
}

async function run(opts: { dataset: string; apply: boolean }): Promise<void> {
  if (opts.dataset === "production") assertSchemaIsDeployedToProduction();
  const schema = extractSchema(opts.dataset);
  const client = datasetClient(opts.dataset, opts.apply);
  log(`dataset=${opts.dataset} apply=${opts.apply} schemaTypes=${schema.length}`);

  const docs = await client.fetch<SanityDoc[]>(
    `*[!(_id in path("_.**")) && !(_type match "sanity.*") && !(_type match "system.*") && !(_type in $skipped)]`,
    { skipped: CUSTOMER_RECORD_TYPES },
  );

  let docsWithUnknown = 0;
  let failedCommits = 0;
  for (const doc of docs) {
    const paths = findUnknownFieldPaths(schema, doc);
    if (paths === null) {
      log(`${doc._id}: _type "${doc._type}" is not in the schema, left alone`);
      continue;
    }
    if (paths.length === 0) continue;
    docsWithUnknown += 1;
    log(`${doc._id} (${doc._type}): ${paths.join(", ")}`);
    if (!opts.apply) continue;
    try {
      await client.patch(doc._id).ifRevisionId(doc._rev).unset(paths).commit();
    } catch (error) {
      failedCommits += 1;
      log(`${doc._id}: unset failed, rerun to retry (${error instanceof Error ? error.message : String(error)})`);
    }
  }

  log(`${docs.length} documents read, ${docsWithUnknown} with unknown fields, ${failedCommits} failed`);
  if (failedCommits > 0) process.exitCode = 1;
}

async function main(): Promise<void> {
  loadDotenv();
  const [dataset, flag] = process.argv.slice(2);
  if (dataset !== "staging" && dataset !== "production") {
    console.error("Usage: pnpm tsx scripts/unset-unknown-sanity-fields.mts staging|production [--apply]");
    process.exit(2);
  }
  await run({ dataset, apply: flag === "--apply" });
}

if (isMainModule(import.meta.url)) {
  await main();
}
