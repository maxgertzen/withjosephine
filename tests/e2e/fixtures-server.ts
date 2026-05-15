import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { serve } from "@hono/node-server";
import { Hono } from "hono";

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
  "bookingGiftForm",
  "bookingPage",
  "giftClaimPage",
  "giftIntakePage",
  "myGiftsPage",
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

export async function startFixtureSidecar(): Promise<FixtureSidecar> {
  const bundle = await loadBundle();
  const app = new Hono();

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

  // next-sanity/live opens an EventSource for revalidation. Return a heartbeat
  // so the EventSource stays open without firing revalidations.
  const sseHeartbeat = (c: import("hono").Context) =>
    c.body(":heartbeat\n", 200, {
      "content-type": "text/event-stream",
      "cache-control": "no-cache",
    });
  app.get("/vX/data/live/events/:dataset", sseHeartbeat);
  app.get("/:apiVersion{v[^/]+}/data/live/events/:dataset", sseHeartbeat);

  // cdn.sanity.io asset URLs get rewritten to apiHost when SANITY_API_HOST is
  // set — 404 cleanly so <Image> falls back instead of hanging on a request.
  app.get("/images/:rest{.+}", (c) => c.notFound());
  app.get("/files/:rest{.+}", (c) => c.notFound());

  app.get("/_e2e/health", (c) =>
    c.json({
      ok: true,
      readings: bundle.readings.length,
      readingsBySlug: Array.from(bundle.readingsBySlug.keys()),
      bookingFormPresent: bundle.singletons.bookingForm != null,
      bookingPagePresent: bundle.singletons.bookingPage != null,
    }),
  );

  return await new Promise<FixtureSidecar>((resolve, reject) => {
    const server = serve({ fetch: app.fetch, port: 0 }, (info) => {
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
