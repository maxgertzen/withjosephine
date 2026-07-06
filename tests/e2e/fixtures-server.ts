import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { serve } from "@hono/node-server";
import { Hono } from "hono";

import { FIXTURE_SIDECAR_PORT } from "./constants";

const here = path.dirname(fileURLToPath(import.meta.url));
const fixtureDir = path.resolve(here, "../../src/__fixtures__/sanity/e2e");

export type FixtureSidecar = {
  port: number;
  url: string;
  stop: () => Promise<void>;
};

type GroqResponse = { ms: number; query: string; result: unknown };

const SINGLETON_DOC_TYPES = [
  "bookingForm",
  "bookingPage",
  "siteSettings",
  "thankYouPage",
  "theme",
] as const;

type SingletonDocType = (typeof SINGLETON_DOC_TYPES)[number];

type FixtureBundle = {
  singletons: Record<SingletonDocType, unknown>;
  readings: unknown[];
  readingsBySlug: Map<string, unknown>;
};

export type CapturedMutationOp =
  | { kind: "create"; id?: string; doc: Record<string, unknown> }
  | { kind: "createOrReplace"; id: string; doc: Record<string, unknown> }
  | { kind: "createIfNotExists"; id: string; doc: Record<string, unknown> }
  | { kind: "patch"; id: string; patch: Record<string, unknown> }
  | { kind: "delete"; id: string };

export type CapturedMutation = {
  txnId: string;
  ops: CapturedMutationOp[];
  at: string;
};

export type CapturedEmail = {
  label: string;
  to: string | string[];
  subject: string;
  html?: string;
  at: string;
};

const mutationLog: CapturedMutation[] = [];
const emailLog: CapturedEmail[] = [];

async function loadJson<T>(filename: string): Promise<T | null> {
  try {
    const raw = await readFile(path.join(fixtureDir, filename), "utf8");
    return JSON.parse(raw) as T;
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === "ENOENT") return null;
    throw err;
  }
}

async function loadBundle(): Promise<FixtureBundle> {
  const entries = await readdir(fixtureDir);
  const readingFiles = entries.filter((f) => f.startsWith("reading-") && f.endsWith(".json"));

  const [singletonValues, readings, readingDocs] = await Promise.all([
    Promise.all(SINGLETON_DOC_TYPES.map((type) => loadJson<unknown>(`${type}.json`))),
    loadJson<unknown[]>("readings.json").then((v) => v ?? []),
    Promise.all(
      readingFiles.map(async (file) => {
        const slug = file.replace(/^reading-/, "").replace(/\.json$/, "");
        const doc = await loadJson<unknown>(file);
        return [slug, doc] as const;
      }),
    ),
  ]);

  const singletons = Object.fromEntries(
    SINGLETON_DOC_TYPES.map((type, idx) => [type, singletonValues[idx]]),
  ) as Record<SingletonDocType, unknown>;

  const readingsBySlug = new Map<string, unknown>();
  for (const [slug, doc] of readingDocs) {
    if (doc) readingsBySlug.set(slug, doc);
  }

  return { singletons, readings, readingsBySlug };
}

function resolveResult(query: string, slug: string | null, bundle: FixtureBundle): unknown {
  const docTypeMatch = query.match(/_type\s*==\s*"([a-zA-Z]+)"/);
  const docType = docTypeMatch?.[1] ?? null;
  const isCollection = query.includes("] |");
  const singleton = !isCollection && /\[0\]/.test(query);

  if (docType === "reading") {
    if (slug && bundle.readingsBySlug.has(slug)) return bundle.readingsBySlug.get(slug);
    if (singleton && slug) return null;
    return bundle.readings;
  }

  if (docType && (SINGLETON_DOC_TYPES as readonly string[]).includes(docType)) {
    return bundle.singletons[docType as SingletonDocType];
  }

  return singleton ? null : [];
}

function parseMutation(raw: unknown): CapturedMutationOp | null {
  if (!raw || typeof raw !== "object") return null;
  const m = raw as Record<string, unknown>;
  if (m.create && typeof m.create === "object") {
    const doc = m.create as Record<string, unknown>;
    return { kind: "create", id: typeof doc._id === "string" ? doc._id : undefined, doc };
  }
  if (m.createOrReplace && typeof m.createOrReplace === "object") {
    const doc = m.createOrReplace as Record<string, unknown>;
    const id = typeof doc._id === "string" ? doc._id : "";
    return { kind: "createOrReplace", id, doc };
  }
  if (m.createIfNotExists && typeof m.createIfNotExists === "object") {
    const doc = m.createIfNotExists as Record<string, unknown>;
    const id = typeof doc._id === "string" ? doc._id : "";
    return { kind: "createIfNotExists", id, doc };
  }
  if (m.patch && typeof m.patch === "object") {
    const patch = m.patch as Record<string, unknown>;
    const id = typeof patch.id === "string" ? patch.id : typeof patch.query === "string" ? "" : "";
    return { kind: "patch", id, patch };
  }
  if (m.delete && typeof m.delete === "object") {
    const del = m.delete as Record<string, unknown>;
    const id = typeof del.id === "string" ? del.id : "";
    return { kind: "delete", id };
  }
  return null;
}

function operationLabel(kind: CapturedMutationOp["kind"]): string {
  switch (kind) {
    case "create":
    case "createOrReplace":
    case "createIfNotExists":
      return "create";
    case "patch":
      return "update";
    case "delete":
      return "delete";
  }
}

export { FIXTURE_SIDECAR_PORT };

export async function startFixtureSidecar(): Promise<FixtureSidecar> {
  const bundle = await loadBundle();
  const app = new Hono();

  if (process.env.E2E_SIDECAR_DEBUG === "1") {
    app.use(async (c, next) => {
      console.log(`[sidecar] ${c.req.method} ${c.req.url}`);
      await next();
    });
  }

  app.get("/:apiVersion{v[^/]+}/data/query/:dataset", (c) => {
    const query = c.req.query("query") ?? "";
    const slugRaw = c.req.query("$slug");
    let slug: string | null = null;
    if (slugRaw) {
      try {
        const parsed = JSON.parse(slugRaw);
        if (typeof parsed === "string") slug = parsed;
      } catch {
        slug = null;
      }
    }
    const result = resolveResult(query, slug, bundle);
    const body: GroqResponse = { ms: 1, query, result };
    return c.json(body);
  });

  app.post("/:apiVersion{v[^/]+}/data/mutate/:dataset", async (c) => {
    let body: { mutations?: unknown[] } = {};
    try {
      body = (await c.req.json()) as { mutations?: unknown[] };
    } catch {
      body = {};
    }
    const rawOps = Array.isArray(body.mutations) ? body.mutations : [];
    const ops = rawOps
      .map(parseMutation)
      .filter((op): op is CapturedMutationOp => op !== null);
    const txnId = `txn-${crypto.randomUUID().slice(0, 8)}`;
    mutationLog.push({ txnId, ops, at: new Date().toISOString() });
    return c.json({
      transactionId: txnId,
      results: ops.map((op) => ({
        id: "id" in op && op.id ? op.id : `gen-${crypto.randomUUID().slice(0, 8)}`,
        operation: operationLabel(op.kind),
      })),
      documents: [],
    });
  });

  app.post("/:apiVersion{v[^/]+}/assets/:type{images|files}/:dataset", async (c) => {
    const type = c.req.param("type");
    const assetId = `${type === "images" ? "image" : "file"}-${crypto.randomUUID().replace(/-/g, "").slice(0, 16)}`;
    const ref = `${type === "images" ? "image" : "file"}-${assetId}`;
    const url = `http://localhost:0/_e2e/assets/${assetId}`;
    return c.json({
      document: {
        _id: assetId,
        _type: type === "images" ? "sanity.imageAsset" : "sanity.fileAsset",
        url,
        path: `${type}/${assetId}`,
        assetId,
      },
      _id: assetId,
      _type: type === "images" ? "sanity.imageAsset" : "sanity.fileAsset",
      url,
      assetId,
      documents: [{ _id: assetId, _ref: ref, url }],
    });
  });

  app.get("/_e2e/captured-mutations", (c) => c.json({ mutations: mutationLog }));
  app.get("/_e2e/captured-emails", (c) => c.json({ emails: emailLog }));

  app.post("/_e2e/captured-emails", async (c) => {
    let body: Partial<CapturedEmail> = {};
    try {
      body = (await c.req.json()) as Partial<CapturedEmail>;
    } catch {
      body = {};
    }
    emailLog.push({
      label: typeof body.label === "string" ? body.label : "unknown",
      to: body.to ?? "unknown",
      subject: typeof body.subject === "string" ? body.subject : "",
      html: typeof body.html === "string" ? body.html : undefined,
      at: new Date().toISOString(),
    });
    return c.json({ ok: true });
  });

  app.post("/_e2e/reset", (c) => {
    mutationLog.length = 0;
    emailLog.length = 0;
    return c.json({ ok: true });
  });

  const sseHeartbeat = (c: import("hono").Context) =>
    c.body(":heartbeat\n", 200, {
      "content-type": "text/event-stream",
      "cache-control": "no-cache",
    });
  app.get("/:apiVersion{v[^/]+}/data/live/events/:dataset", sseHeartbeat);

  app.get("/images/:rest{.+}", (c) => c.notFound());
  app.get("/files/:rest{.+}", (c) => c.notFound());

  app.get("/_e2e/health", (c) =>
    c.json({
      ok: true,
      readings: bundle.readings.length,
      readingsBySlug: Array.from(bundle.readingsBySlug.keys()),
      bookingFormPresent: bundle.singletons.bookingForm != null,
      bookingPagePresent: bundle.singletons.bookingPage != null,
      mutationsCaptured: mutationLog.length,
      emailsCaptured: emailLog.length,
    }),
  );

  return await new Promise<FixtureSidecar>((resolve, reject) => {
    const server = serve({ fetch: app.fetch, port: FIXTURE_SIDECAR_PORT }, (info) => {
      const port = info.port;
      const url = `http://127.0.0.1:${port}`;
      resolve({
        port,
        url,
        stop: () =>
          new Promise<void>((res, rej) => {
            server.close((err) => (err ? rej(err) : res()));
          }),
      });
    });
    server.on?.("error", reject);
  });
}
