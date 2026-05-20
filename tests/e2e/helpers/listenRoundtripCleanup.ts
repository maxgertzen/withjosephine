import { spawn } from "node:child_process";

import { getStagingSanityClient, requireStagingEnv } from "./stagingApi";

const EMAIL_LIKE = "listen-roundtrip+%";
const SANITY_MATCH = "listen-roundtrip+*";
const STAGING_DB = "withjosephine-bookings-staging";
const WRANGLER_TIMEOUT_MS = 30_000;

// FK-order: sessions → magic_links → audit → submissions → user.
const USER_IDS = `SELECT id FROM user WHERE email LIKE '${EMAIL_LIKE}'`;
const D1_STATEMENTS = [
  `DELETE FROM listen_session    WHERE user_id IN (${USER_IDS});`,
  `DELETE FROM listen_magic_link WHERE user_id IN (${USER_IDS});`,
  `DELETE FROM listen_audit      WHERE user_id IN (${USER_IDS});`,
  `DELETE FROM submissions       WHERE email LIKE '${EMAIL_LIKE}';`,
  `DELETE FROM user              WHERE email LIKE '${EMAIL_LIKE}';`,
];

function assertStagingDataset(): void {
  const dataset = requireStagingEnv("NEXT_PUBLIC_SANITY_DATASET");
  if (dataset !== "staging") {
    throw new Error(
      `[listenRoundtripCleanup] refusing to run against dataset="${dataset}" (only "staging" allowed)`,
    );
  }
}

async function wipeStagingD1(): Promise<void> {
  assertStagingDataset();
  const command = D1_STATEMENTS.join(" ");
  await new Promise<void>((resolve, reject) => {
    const child = spawn(
      "pnpm",
      [
        "exec",
        "wrangler",
        "d1",
        "execute",
        STAGING_DB,
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
          `[listenRoundtripCleanup] wrangler d1 execute timed out after ${WRANGLER_TIMEOUT_MS}ms`,
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
          `[listenRoundtripCleanup] wrangler d1 execute exited ${code}: ${stderr.slice(0, 500)}`,
        ),
      );
    });
  });
}

async function wipeStagingSanity(): Promise<number> {
  assertStagingDataset();
  const client = getStagingSanityClient("write");
  const docs = await client.fetch<Array<{ _id: string }>>(
    `*[_type == "submission" && email match $pattern]{ _id }`,
    { pattern: SANITY_MATCH },
  );
  if (docs.length === 0) return 0;
  const tx = client.transaction();
  for (const d of docs) tx.delete(d._id);
  await tx.commit({ visibility: "async" });
  return docs.length;
}

export async function cleanupListenRoundtripState(): Promise<{
  sanityDeleted: number;
}> {
  const [, sanityDeleted] = await Promise.all([
    wipeStagingD1(),
    wipeStagingSanity(),
  ]);
  return { sanityDeleted };
}
