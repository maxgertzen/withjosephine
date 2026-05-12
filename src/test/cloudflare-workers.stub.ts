/**
 * Test-only stub for the `cloudflare:workers` virtual module. The real
 * module is provided by workerd at runtime; outside that runtime, imports
 * resolve here. Tests that need richer behavior override this via `vi.mock`.
 */
export class DurableObject {
  ctx: unknown;
  env: unknown;
  constructor(ctx: unknown, env: unknown) {
    this.ctx = ctx;
    this.env = env;
  }
}
