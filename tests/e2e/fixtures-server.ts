import { serve } from "@hono/node-server";
import { Hono } from "hono";
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const fixtureDir = path.resolve(here, "../../src/__fixtures__/sanity/e2e");

export type FixtureSidecar = {
  port: number;
  url: string;
  stop: () => Promise<void>;
};

type GroqResponse = { ms: number; query: string; result: unknown };

type FixtureBundle = {
  bookingForm: unknown;
  bookingGiftForm: unknown;
  bookingPage: unknown;
  giftClaimPage: unknown;
  giftIntakePage: unknown;
  myGiftsPage: unknown;
  readings: unknown[];
  siteSettings: unknown;
  thankYouPage: unknown;
  theme: unknown;
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
  const readingsBySlug = new Map<string, unknown>();
  for (const file of readingFiles) {
    const slug = file.replace(/^reading-/, "").replace(/\.json$/, "");
    const doc = await loadJson<unknown>(file);
    if (doc) readingsBySlug.set(slug, doc);
  }
  return {
    bookingForm: await loadJson("bookingForm.json"),
    bookingGiftForm: await loadJson("bookingGiftForm.json"),
    bookingPage: await loadJson("bookingPage.json"),
    giftClaimPage: await loadJson("giftClaimPage.json"),
    giftIntakePage: await loadJson("giftIntakePage.json"),
    myGiftsPage: await loadJson("myGiftsPage.json"),
    readings: (await loadJson<unknown[]>("readings.json")) ?? [],
    siteSettings: await loadJson("siteSettings.json"),
    thankYouPage: await loadJson("thankYouPage.json"),
    theme: await loadJson("theme.json"),
    readingsBySlug,
  };
}

function resolveResult(query: string, slug: string | null, bundle: FixtureBundle): unknown {
  const docTypeMatch = query.match(/_type\s*==\s*"([a-zA-Z]+)"/);
  const docType = docTypeMatch?.[1] ?? null;
  const isCollection = /\*\[_type\s*==\s*"[^"]+"\]\s*(\|)/.test(query) || query.includes("] |");
  const singleton = !isCollection && /\[0\]/.test(query);

  switch (docType) {
    case "reading":
      if (slug && bundle.readingsBySlug.has(slug)) return bundle.readingsBySlug.get(slug);
      if (singleton && slug) return null;
      return bundle.readings;
    case "bookingForm":
      return bundle.bookingForm;
    case "bookingGiftForm":
      return bundle.bookingGiftForm;
    case "bookingPage":
      return bundle.bookingPage;
    case "giftClaimPage":
      return bundle.giftClaimPage;
    case "giftIntakePage":
      return bundle.giftIntakePage;
    case "myGiftsPage":
      return bundle.myGiftsPage;
    case "siteSettings":
      return bundle.siteSettings;
    case "thankYouPage":
      return bundle.thankYouPage;
    case "theme":
      return bundle.theme;
    default:
      return singleton ? null : [];
  }
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

  // next-sanity/live opens an EventSource for revalidation. Return an empty
  // stream that closes immediately — no revalidations during E2E tests.
  app.get("/vX/data/live/events/:dataset", (c) =>
    c.body(":heartbeat\n", 200, {
      "content-type": "text/event-stream",
      "cache-control": "no-cache",
    }),
  );
  app.get("/:apiVersion{v[^/]+}/data/live/events/:dataset", (c) =>
    c.body(":heartbeat\n", 200, {
      "content-type": "text/event-stream",
      "cache-control": "no-cache",
    }),
  );

  // Asset CDN URLs (cdn.sanity.io) get rewritten to apiHost — return 404 so
  // <Image> components fall back to placeholder behavior instead of hanging.
  app.get("/images/:rest{.+}", (c) => c.notFound());
  app.get("/files/:rest{.+}", (c) => c.notFound());

  app.get("/_e2e/health", (c) =>
    c.json({
      ok: true,
      readings: bundle.readings.length,
      readingsBySlug: Array.from(bundle.readingsBySlug.keys()),
      bookingFormPresent: bundle.bookingForm != null,
      bookingPagePresent: bundle.bookingPage != null,
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
