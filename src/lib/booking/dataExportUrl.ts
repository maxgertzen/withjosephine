import { type ExportTokenMintSource, mintExportToken } from "../auth/exportToken";
import { siteOrigin } from "../env";

export async function mintDataExportUrl(args: {
  submissionId: string;
  recipientUserId: string | null;
  mintSource: ExportTokenMintSource;
}): Promise<string | undefined> {
  if (!args.recipientUserId) return undefined;
  try {
    const token = await mintExportToken({
      submissionId: args.submissionId,
      recipientUserId: args.recipientUserId,
      mintSource: args.mintSource,
    });
    return `${siteOrigin()}/privacy/export?t=${token}`;
  } catch (error) {
    console.error(`[data-export-url] export token mint failed for ${args.submissionId}`, error);
    return undefined;
  }
}
