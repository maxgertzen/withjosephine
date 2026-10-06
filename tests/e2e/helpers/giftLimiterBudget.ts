import { readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const LIMITER_CALLS_PER_PERIOD = 5;
const LIMITER_PERIOD_MS = 60_000;
const CALL_TO_SERVER_LAG_MS = 5_000;
const SLIDING_WINDOW_MS = LIMITER_PERIOD_MS + CALL_TO_SERVER_LAG_MS;
const CALL_LOG_PATH = join(tmpdir(), "withjosephine-e2e-gift-limiter-calls.json");

function readCallLog(): number[] {
  try {
    const parsed: unknown = JSON.parse(readFileSync(CALL_LOG_PATH, "utf8"));
    return Array.isArray(parsed) ? parsed.filter((at): at is number => typeof at === "number") : [];
  } catch {
    return [];
  }
}

function callsInWindow(now: number): number[] {
  return readCallLog().filter((at) => now - at < SLIDING_WINDOW_MS);
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function msUntilOldestCallLeavesWindow(calls: number[], now: number): number {
  return Math.min(...calls) + SLIDING_WINDOW_MS - now;
}

function msLeftInLimiterPeriod(now: number): number {
  return LIMITER_PERIOD_MS - (now % LIMITER_PERIOD_MS);
}

export function recordGiftLimiterCall(): void {
  const now = Date.now();
  writeFileSync(CALL_LOG_PATH, JSON.stringify([...callsInWindow(now), now]));
}

export async function spendGiftLimiterCall<T>(call: () => Promise<T>): Promise<T> {
  for (;;) {
    const now = Date.now();
    const calls = callsInWindow(now);
    if (calls.length < LIMITER_CALLS_PER_PERIOD) break;
    await sleep(msUntilOldestCallLeavesWindow(calls, now));
  }
  recordGiftLimiterCall();
  return call();
}

export async function waitForEmptyGiftLimiterWindow({
  minimumPeriodLeftMs,
}: {
  minimumPeriodLeftMs: number;
}): Promise<void> {
  for (;;) {
    const now = Date.now();
    const calls = callsInWindow(now);
    if (calls.length > 0) {
      await sleep(msUntilOldestCallLeavesWindow(calls, now));
      continue;
    }
    const periodLeft = msLeftInLimiterPeriod(now);
    if (periodLeft >= minimumPeriodLeftMs) return;
    await sleep(periodLeft);
  }
}
