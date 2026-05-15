import { serve } from "@hono/node-server";
import { Hono } from "hono";

import { loadFixtureReadings } from "./fixtures/sanity-data";

export type FixtureSidecar = {
  port: number;
  url: string;
  stop: () => Promise<void>;
};

type GroqResponse = { ms: number; query: string; result: unknown };

function matchReadingBySlug(query: string): string | null {
  const m = query.match(/slug\.current\s*==\s*\$slug/);
  if (!m) return null;
  return "readingBySlug";
}

function matchAllReadings(query: string): boolean {
  return /\*\[_type\s*==\s*"reading"\]/.test(query) && !/\$slug/.test(query);
}

export async function startFixtureSidecar(): Promise<FixtureSidecar> {
  const app = new Hono();
  const readings = await loadFixtureReadings();

  app.get("/v:apiVersion/data/query/:dataset", (c) => {
    const query = c.req.query("query") ?? "";
    const paramsRaw = c.req.query("$slug");
    const slug = paramsRaw ? JSON.parse(paramsRaw) : null;
    let result: unknown = null;
    if (matchReadingBySlug(query) && typeof slug === "string") {
      result = readings.find((r) => r.slug === slug) ?? null;
    } else if (matchAllReadings(query)) {
      result = readings;
    } else {
      result = null;
    }
    const body: GroqResponse = { ms: 1, query, result };
    return c.json(body);
  });

  app.get("/_e2e/health", (c) => c.json({ ok: true, readings: readings.length }));

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
