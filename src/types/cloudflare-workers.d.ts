declare type Fetcher = import("@cloudflare/workers-types").Fetcher;

declare module "cloudflare:workers" {
  type DurableObjectStorage = import("@cloudflare/workers-types").DurableObjectStorage;
  type DurableObjectState = import("@cloudflare/workers-types").DurableObjectState;

  export class DurableObject<Env = unknown> {
    constructor(ctx: DurableObjectState, env: Env);
    ctx: DurableObjectState;
    env: Env;
  }
}
