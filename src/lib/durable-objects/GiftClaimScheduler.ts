import { DurableObject } from "cloudflare:workers";

// Logs from this file may contain only `submissionId` — `wrangler tail` is
// shared. No raw emails, Resend message IDs, tokens, or recipient names.

export type GiftClaimSchedulerEnv = {
  DO_DISPATCH_SECRET?: string;
  NEXT_PUBLIC_SITE_ORIGIN?: string;
  // Service binding to the same worker. Lets alarm() dispatch in-isolate
  // instead of taking the public-edge HTTPS round-trip. Optional so unit
  // tests can stub it.
  SELF?: Fetcher;
};

type DispatchResponse = {
  outcome: "first_send" | "reminder" | "stop";
  reason?: string;
  nextAlarmMs: number | null;
};

function defaultOrigin(env: GiftClaimSchedulerEnv): string {
  return env.NEXT_PUBLIC_SITE_ORIGIN ?? "https://withjosephine.com";
}

type GiftClaimSchedulerStub = { fetch(request: Request): Promise<Response> };
type GiftClaimSchedulerId = { toString(): string };
export type GiftClaimSchedulerNamespace = {
  idFromName(name: string): GiftClaimSchedulerId;
  get(id: GiftClaimSchedulerId): GiftClaimSchedulerStub;
};

declare global {
  interface CloudflareEnv {
    GIFT_CLAIM_SCHEDULER?: GiftClaimSchedulerNamespace;
    DO_DISPATCH_SECRET?: string;
    NEXT_PUBLIC_SITE_ORIGIN?: string;
    SELF?: Fetcher;
  }
}

export class GiftClaimScheduler extends DurableObject<GiftClaimSchedulerEnv> {
  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);
    if (request.method === "POST" && url.pathname === "/cancel") {
      // Idempotent: deleteAlarm + deleteAll both no-op on missing state.
      // Lets the purchaser flip scheduled→self_send without racing the alarm.
      await this.ctx.storage.deleteAlarm();
      await this.ctx.storage.deleteAll();
      return new Response(JSON.stringify({ cancelled: true }), {
        status: 200,
        headers: { "content-type": "application/json" },
      });
    }
    if (request.method !== "POST" || url.pathname !== "/schedule") {
      return new Response("Not found", { status: 404 });
    }

    const body = (await request.json().catch(() => null)) as
      | { fireAtMs?: unknown; submissionId?: unknown }
      | null;
    const fireAtMs = body?.fireAtMs;
    const submissionId = body?.submissionId;
    if (
      typeof fireAtMs !== "number" ||
      !Number.isFinite(fireAtMs) ||
      typeof submissionId !== "string" ||
      submissionId.length === 0
    ) {
      return new Response("Invalid body", { status: 400 });
    }

    await this.ctx.storage.put("submissionId", submissionId);
    // Resets retryCount when the same DO is re-scheduled (e.g. purchaser
    // edits `gift_send_at` after the original alarm was set).
    await this.ctx.storage.put("retryCount", 0);
    await this.ctx.storage.setAlarm(fireAtMs);

    return new Response(JSON.stringify({ scheduled: true, fireAtMs }), {
      status: 200,
      headers: { "content-type": "application/json" },
    });
  }

  async alarm(): Promise<void> {
    const submissionId = await this.ctx.storage.get<string>("submissionId");
    if (!submissionId) {
      // Stale alarm with no state — clear and exit.
      await this.ctx.storage.deleteAll();
      return;
    }
    const retryCount = (await this.ctx.storage.get<number>("retryCount")) ?? 0;

    const secret = this.env.DO_DISPATCH_SECRET;
    if (!secret) {
      console.error(
        "[GiftClaimScheduler] DO_DISPATCH_SECRET not set — cannot reach dispatch route",
      );
      return;
    }

    // Prefer the `SELF` service binding (in-isolate fetch — same worker,
    // no public-edge round-trip, lower latency, exempt from rate-limits and
    // Access policies). Falls back to a public-edge fetch only in dev/test
    // contexts where the binding isn't wired (existing unit tests stub
    // `globalThis.fetch` and don't provide a `SELF` Fetcher).
    const dispatchUrl = this.env.SELF
      ? "https://internal/api/internal/gift-claim-dispatch"
      : `${defaultOrigin(this.env)}/api/internal/gift-claim-dispatch`;
    const dispatcher = this.env.SELF ?? globalThis;
    const res = await dispatcher.fetch(dispatchUrl, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-do-secret": secret,
      },
      body: JSON.stringify({ submissionId, retryCount }),
    });

    if (!res.ok) {
      // Surface the failure so wrangler tail catches it; Cloudflare auto-retries
      // alarms that throw, so don't rethrow here — that would cause a re-fire
      // loop while the dispatch route is the actual broken thing.
      console.error(
        `[GiftClaimScheduler] dispatch HTTP ${res.status} for ${submissionId}`,
      );
      return;
    }

    const payload = (await res.json().catch(() => null)) as DispatchResponse | null;
    if (!payload) {
      console.error(`[GiftClaimScheduler] dispatch returned non-JSON for ${submissionId}`);
      return;
    }

    if (payload.nextAlarmMs === null) {
      await this.ctx.storage.deleteAll();
      return;
    }

    await this.ctx.storage.put("retryCount", retryCount + 1);
    await this.ctx.storage.setAlarm(payload.nextAlarmMs);
  }
}
