/**
 * Thin wrapper around the `GIFT_CLAIM_SCHEDULER` Durable Object binding.
 *
 * Bindings live on `env` from `getCloudflareContext`, NOT on `globalThis`,
 * in the OpenNext route-handler runtime. A prior implementation read from
 * `globalThis.GIFT_CLAIM_SCHEDULER` which is `undefined` in production —
 * `scheduleGiftAlarm` always returned false silently, and the staging gift
 * `81ea25b7` flipped to scheduled but never had an alarm queued. The stripe
 * webhook used the correct pattern, which is why purchase-time scheduled
 * gifts worked while user-initiated flips did not.
 *
 * Both operations are idempotent on the DO side:
 *   - `scheduleGiftAlarm` overwrites any prior alarm (resets retryCount).
 *   - `cancelGiftAlarm` deletes the alarm + storage; safe to re-call.
 */
import { getCloudflareContext } from "@opennextjs/cloudflare";

type GiftClaimSchedulerStub = { fetch(request: Request): Promise<Response> };

async function getStub(submissionId: string): Promise<GiftClaimSchedulerStub | null> {
  let namespace: CloudflareEnv["GIFT_CLAIM_SCHEDULER"] | undefined;
  try {
    const { env } = await getCloudflareContext({ async: true });
    namespace = env.GIFT_CLAIM_SCHEDULER;
  } catch {
    return null;
  }
  if (!namespace) return null;
  return namespace.get(namespace.idFromName(submissionId));
}

export async function scheduleGiftAlarm(args: {
  submissionId: string;
  fireAtMs: number;
}): Promise<boolean> {
  const stub = await getStub(args.submissionId);
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
  const stub = await getStub(submissionId);
  if (!stub) {
    console.warn("[giftClaimScheduler] GIFT_CLAIM_SCHEDULER binding missing — cancel skipped");
    return false;
  }
  const res = await stub.fetch(new Request("https://do/cancel", { method: "POST", body: "{}" }));
  return res.ok;
}
