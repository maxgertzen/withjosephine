import {
  execWranglerD1,
  getStagingSanityClient,
  queryStagingD1,
  requireStagingEnv,
} from "./stagingApi";

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

function giftResidueWhere(likePattern: string): string {
  return `buyer_email LIKE '${likePattern}'`;
}

function buildD1Statements(likePattern: string): string[] {
  const userIds = `SELECT id FROM user WHERE email LIKE '${likePattern}'`;
  return [
    `DELETE FROM listen_session    WHERE user_id IN (${userIds});`,
    `DELETE FROM listen_magic_link WHERE user_id IN (${userIds});`,
    `DELETE FROM listen_audit      WHERE user_id IN (${userIds});`,
    `DELETE FROM gift_codes        WHERE ${giftResidueWhere(likePattern)};`,
    `DELETE FROM submissions       WHERE email LIKE '${likePattern}';`,
    `DELETE FROM user              WHERE email LIKE '${likePattern}';`,
  ];
}

async function wipeStagingD1(likePattern: string): Promise<void> {
  const command = buildD1Statements(likePattern).join(" ");
  await execWranglerD1({ command, caller: "sandboxResidueCleanup" });
}

async function listStagingGiftIds(likePattern: string): Promise<string[]> {
  const rows = await queryStagingD1<{ id: string }>(
    `SELECT id FROM gift_codes WHERE ${giftResidueWhere(likePattern)}`,
  );
  return rows.map((row) => row.id);
}

async function wipeStagingSanity(matchPattern: string, giftIds: string[]): Promise<number> {
  const client = getStagingSanityClient("write");
  const docs = await client.fetch<Array<{ _id: string }>>(
    `*[_type == "submission" && (email match $pattern || _id in $giftIds)]{ _id }`,
    { pattern: matchPattern, giftIds },
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
    throw new Error(`[sandboxResidueCleanup] emailPrefix must end with "+" (got "${emailPrefix}")`);
  }
  assertStagingDataset();

  const likePattern = `${emailPrefix}%`;
  const matchPattern = `${emailPrefix}*`;

  const giftIds = await listStagingGiftIds(likePattern);
  const [, sanityDeleted] = await Promise.all([
    wipeStagingD1(likePattern),
    wipeStagingSanity(matchPattern, giftIds),
  ]);

  return { sanityDeleted };
}
