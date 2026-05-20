import { spawn } from "node:child_process";

import { getStagingSanityClient, requireStagingEnv } from "./stagingApi";

const WRANGLER_TIMEOUT_MS = 30_000;
const STAGING_D1_DATABASE = "withjosephine-bookings-staging";

export type SandboxResidueCleanupOptions = {
  emailPrefix: string;
};

function assertStagingDataset(): void {
  const dataset = requireStagingEnv("NEXT_PUBLIC_SANITY_DATASET");
  if (dataset !== "staging") {
    throw new Error(
      `[sandboxResidueCleanup] refusing to run against dataset="${dataset}" (only "staging" allowed)`,
    );
  }
}

function buildD1Statements(likePattern: string): string[] {
  const userIds = `SELECT id FROM user WHERE email LIKE '${likePattern}'`;
  return [
    `DELETE FROM listen_session    WHERE user_id IN (${userIds});`,
    `DELETE FROM listen_magic_link WHERE user_id IN (${userIds});`,
    `DELETE FROM listen_audit      WHERE user_id IN (${userIds});`,
    `DELETE FROM submissions       WHERE email LIKE '${likePattern}';`,
    `DELETE FROM user              WHERE email LIKE '${likePattern}';`,
  ];
}

async function wipeStagingD1(likePattern: string): Promise<void> {
  const command = buildD1Statements(likePattern).join(" ");
  await new Promise<void>((resolve, reject) => {
    const child = spawn(
      "pnpm",
      [
        "exec",
        "wrangler",
        "d1",
        "execute",
        STAGING_D1_DATABASE,
        "--remote",
        "--command",
        command,
      ],
      { stdio: ["ignore", "pipe", "pipe"] },
    );
    let stderr = "";
    child.stderr.on("data", (chunk: Buffer) => {
      stderr += chunk.toString();
    });
    const timer = setTimeout(() => {
      child.kill("SIGTERM");
      reject(
        new Error(
          `[sandboxResidueCleanup] wrangler d1 execute timed out after ${WRANGLER_TIMEOUT_MS}ms`,
        ),
      );
    }, WRANGLER_TIMEOUT_MS);
    child.on("error", (err) => {
      clearTimeout(timer);
      reject(err);
    });
    child.on("exit", (code) => {
      clearTimeout(timer);
      if (code === 0) return resolve();
      reject(
        new Error(
          `[sandboxResidueCleanup] wrangler d1 execute exited ${code}: ${stderr.slice(0, 500)}`,
        ),
      );
    });
  });
}

async function wipeStagingSanity(matchPattern: string): Promise<number> {
  const client = getStagingSanityClient("write");
  const docs = await client.fetch<Array<{ _id: string }>>(
    `*[_type == "submission" && email match $pattern]{ _id }`,
    { pattern: matchPattern },
  );
  if (docs.length === 0) return 0;
  const tx = client.transaction();
  for (const d of docs) tx.delete(d._id);
  await tx.commit({ visibility: "async" });
  return docs.length;
}

export async function cleanupSandboxResidue(
  options: SandboxResidueCleanupOptions,
): Promise<{ sanityDeleted: number }> {
  const { emailPrefix } = options;
  if (!emailPrefix.endsWith("+")) {
    throw new Error(
      `[sandboxResidueCleanup] emailPrefix must end with "+" (got "${emailPrefix}")`,
    );
  }
  assertStagingDataset();

  const likePattern = `${emailPrefix}%`;
  const matchPattern = `${emailPrefix}*`;

  const [, sanityDeleted] = await Promise.all([
    wipeStagingD1(likePattern),
    wipeStagingSanity(matchPattern),
  ]);

  return { sanityDeleted };
}
