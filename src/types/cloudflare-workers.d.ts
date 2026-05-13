/**
 * Minimal local shim for the `cloudflare:workers` virtual module — enough
 * surface for the `GiftClaimScheduler` Durable Object class to typecheck
 * without pulling all of `@cloudflare/workers-types` into the global lib
 * set (which conflicts with the DOM `Response.json()` return-type in our
 * test files). Wrangler resolves the real module at bundle time.
 */
// Minimal `Fetcher` shape for Cloudflare service bindings (e.g. `env.SELF`).
// The real type from `@cloudflare/workers-types` is structurally compatible
// with `globalThis.fetch`; we only need the call signature to compile.
declare interface Fetcher {
  fetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response>;
}

declare module "cloudflare:workers" {
  interface DurableObjectStorage {
    get<T = unknown>(key: string): Promise<T | undefined>;
    put<T>(key: string, value: T): Promise<void>;
    setAlarm(scheduledTime: number | Date): Promise<void>;
    getAlarm(): Promise<number | null>;
    deleteAlarm(): Promise<void>;
    deleteAll(): Promise<void>;
  }

  interface DurableObjectState {
    storage: DurableObjectStorage;
  }

  export class DurableObject<Env = unknown> {
    constructor(ctx: DurableObjectState, env: Env);
    ctx: DurableObjectState;
    env: Env;
  }
}
