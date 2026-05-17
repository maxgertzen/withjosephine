import type { APIRequestContext } from "@playwright/test";

import type { CapturedEmail, CapturedMutation, CapturedMutationOp } from "../fixtures-server";

export type { CapturedEmail, CapturedMutation, CapturedMutationOp };

function sidecarUrl(): string {
  const url = process.env.E2E_CAPTURE_URL;
  if (!url) {
    throw new Error(
      "E2E_CAPTURE_URL is not set. The fixture sidecar must be running and its URL " +
        "must be exported into the Next dev server's environment.",
    );
  }
  return url;
}

export async function resetCapturedState(request: APIRequestContext): Promise<void> {
  const res = await request.post(`${sidecarUrl()}/_e2e/reset`);
  if (!res.ok()) {
    throw new Error(`Failed to reset captured state: ${res.status()} ${await res.text()}`);
  }
}

export async function getCapturedMutations(
  request: APIRequestContext,
): Promise<CapturedMutation[]> {
  const res = await request.get(`${sidecarUrl()}/_e2e/captured-mutations`);
  if (!res.ok()) throw new Error(`Failed to fetch captured mutations: ${res.status()}`);
  return ((await res.json()) as { mutations: CapturedMutation[] }).mutations;
}

export async function getCapturedEmails(request: APIRequestContext): Promise<CapturedEmail[]> {
  const res = await request.get(`${sidecarUrl()}/_e2e/captured-emails`);
  if (!res.ok()) throw new Error(`Failed to fetch captured emails: ${res.status()}`);
  return ((await res.json()) as { emails: CapturedEmail[] }).emails;
}

export function flattenOps(mutations: CapturedMutation[]): CapturedMutationOp[] {
  return mutations.flatMap((m) => m.ops);
}

export function findCreateByType(
  mutations: CapturedMutation[],
  type: string,
): CapturedMutationOp | null {
  for (const op of flattenOps(mutations)) {
    if (
      (op.kind === "create" || op.kind === "createOrReplace" || op.kind === "createIfNotExists") &&
      op.doc._type === type
    ) {
      return op;
    }
  }
  return null;
}
