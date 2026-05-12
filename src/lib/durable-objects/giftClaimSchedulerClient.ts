/**
 * Thin wrapper around the `GIFT_CLAIM_SCHEDULER` Durable Object binding.
 * Workers expose the binding on `globalThis` in our runtime config; routes
 * import these helpers instead of repeating the cast + Request-building.
 *
 * Both operations are idempotent on the DO side:
 *   - `scheduleGiftAlarm` overwrites any prior alarm (resets retryCount).
 *   - `cancelGiftAlarm` deletes the alarm + storage; safe to re-call.
 */

type GiftClaimSchedulerStub = { fetch(request: Request): Promise<Response> };

function getNamespace(): CloudflareEnv["GIFT_CLAIM_SCHEDULER"] | null {
  const ns = (globalThis as { GIFT_CLAIM_SCHEDULER?: unknown }).GIFT_CLAIM_SCHEDULER as
    | CloudflareEnv["GIFT_CLAIM_SCHEDULER"]
    | undefined;
  return ns ?? null;
}

function getStub(submissionId: string): GiftClaimSchedulerStub | null {
  const ns = getNamespace();
  if (!ns) return null;
  return ns.get(ns.idFromName(submissionId));
}

export async function scheduleGiftAlarm(args: {
  submissionId: string;
  fireAtMs: number;
}): Promise<boolean> {
  const stub = getStub(args.submissionId);
  if (!stub) {
    console.warn("[giftClaimScheduler] GIFT_CLAIM_SCHEDULER binding missing — schedule skipped");
    return false;
  }
  const res = await stub.fetch(
    new Request("https://do/schedule", {
      method: "POST",
      body: JSON.stringify({ fireAtMs: args.fireAtMs, submissionId: args.submissionId }),
    }),
  );
  return res.ok;
}

export async function cancelGiftAlarm(submissionId: string): Promise<boolean> {
  const stub = getStub(submissionId);
  if (!stub) {
    console.warn("[giftClaimScheduler] GIFT_CLAIM_SCHEDULER binding missing — cancel skipped");
    return false;
  }
  const res = await stub.fetch(new Request("https://do/cancel", { method: "POST", body: "{}" }));
  return res.ok;
}
