import { vi } from "vitest";

export type RecordedSanityWrite =
  | ["createIfNotExists", unknown]
  | ["patch", unknown, Record<string, unknown>];

type Doc = Record<string, unknown> & { _id: string };
type Selection = string | { query: string; params: { id: string } };

const SUPPORTED_QUERY = /^\*\[_id == \$id(?: && !defined\((\w+)\))?\]$/;

function setPath(doc: Record<string, unknown>, path: string, value: unknown): void {
  const [head, ...rest] = path.split(".");
  if (rest.length === 0) {
    doc[head] = value;
    return;
  }
  const child = (doc[head] ?? {}) as Record<string, unknown>;
  doc[head] = child;
  setPath(child, rest.join("."), value);
}

function unsetPath(doc: Record<string, unknown>, path: string): void {
  const [head, ...rest] = path.split(".");
  if (rest.length === 0) {
    delete doc[head];
    return;
  }
  const child = doc[head] as Record<string, unknown> | undefined;
  if (child) unsetPath(child, rest.join("."));
}

function stripUndefined(value: unknown): unknown {
  return value === undefined ? undefined : JSON.parse(JSON.stringify(value));
}

function selectDocs(documents: Map<string, Doc>, selection: Selection): Doc[] {
  if (typeof selection === "string") {
    const doc = documents.get(selection);
    if (!doc) throw new Error(`patch on missing document ${selection}`);
    return [doc];
  }
  const match = SUPPORTED_QUERY.exec(selection.query);
  if (!match) throw new Error(`unsupported selection query ${selection.query}`);
  const doc = documents.get(selection.params.id);
  const mustBeUndefined = match[1];
  return doc && (!mustBeUndefined || doc[mustBeUndefined] === undefined) ? [doc] : [];
}

function applyPatch(doc: Doc, operations: Record<string, unknown>): void {
  for (const [path, value] of Object.entries((operations.set ?? {}) as Record<string, unknown>)) {
    if (value !== undefined) setPath(doc, path, stripUndefined(value));
  }
  for (const [path, value] of Object.entries(
    (operations.setIfMissing ?? {}) as Record<string, unknown>,
  )) {
    if (value !== undefined && doc[path] === undefined) setPath(doc, path, stripUndefined(value));
  }
  for (const path of (operations.unset ?? []) as string[]) unsetPath(doc, path);
}

export function recordingSanityClient() {
  const writes: RecordedSanityWrite[] = [];
  const documents = new Map<string, Doc>();
  const commit = vi.fn<(options?: unknown) => Promise<void>>(async () => undefined);
  const fetch = vi.fn();

  function apply(write: RecordedSanityWrite): void {
    if (write[0] === "createIfNotExists") {
      const doc = stripUndefined(write[1]) as Doc;
      if (!documents.has(doc._id)) documents.set(doc._id, doc);
      return;
    }
    for (const doc of selectDocs(documents, write[1] as Selection)) applyPatch(doc, write[2]);
  }

  function committing(pending: RecordedSanityWrite[]) {
    return async (options?: unknown) => {
      await commit(options);
      for (const write of pending) apply(write);
    };
  }

  function transaction() {
    const pending: RecordedSanityWrite[] = [];
    const record = (write: RecordedSanityWrite) => {
      writes.push(write);
      pending.push(write);
    };
    const builder = {
      createIfNotExists: (doc: unknown) => {
        record(["createIfNotExists", doc]);
        return builder;
      },
      patch: (selection: unknown, operations: Record<string, unknown>) => {
        record(["patch", selection, operations]);
        return builder;
      },
      commit: committing(pending),
    };
    return builder;
  }

  function patch(selection: unknown) {
    const operations: Record<string, unknown> = {};
    const write: RecordedSanityWrite = ["patch", selection, operations];
    writes.push(write);
    const builder = {
      set: (fields: unknown) => {
        operations.set = fields;
        return builder;
      },
      unset: (paths: unknown) => {
        operations.unset = paths;
        return builder;
      },
      commit: committing([write]),
    };
    return builder;
  }

  return {
    client: { fetch, transaction, patch },
    writes,
    documents,
    commit,
    reset() {
      writes.length = 0;
      documents.clear();
      commit.mockReset().mockResolvedValue(undefined);
      fetch.mockReset();
    },
  };
}
