import {
  type LibraryTokenMintSource,
  mintLibraryToken,
} from "@/lib/auth/libraryToken";
import { siteOrigin } from "@/lib/env";

/**
 * Single helper for minting a one-tap library URL. All five send paths
 * (notifyPaid OC, day-7 cron, gift webhook self-send + scheduled branches,
 * admin resend) call this to get a token-bearing URL pointing at the
 * welcome interstitial. Centralizing here keeps the mintSource provenance
 * + URL shape consistent across surfaces.
 */
export async function buildLibraryUrl(args: {
  userId: string;
  mintSource: LibraryTokenMintSource;
}): Promise<string> {
  const token = await mintLibraryToken({
    userId: args.userId,
    mintSource: args.mintSource,
  });
  return `${siteOrigin()}/my-readings/welcome?t=${encodeURIComponent(token)}`;
}
