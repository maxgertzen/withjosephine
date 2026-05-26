import {
  type LibraryTokenMintSource,
  mintLibraryToken,
} from "@/lib/auth/libraryToken";
import { siteOrigin } from "@/lib/env";

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

/**
 * Fail-safe wrapper: returns undefined and logs on mint failure (missing secret,
 * crypto error). Email senders that should NOT be blocked by a missing library
 * button use this; the email still ships, just without the secondary CTA.
 */
export async function tryBuildLibraryUrl(args: {
  userId: string;
  mintSource: LibraryTokenMintSource;
  siteContext: string;
}): Promise<string | undefined> {
  try {
    return await buildLibraryUrl({ userId: args.userId, mintSource: args.mintSource });
  } catch (error) {
    console.error(
      `[${args.siteContext}] library URL mint failed; sending without library button`,
      error,
    );
    return undefined;
  }
}
