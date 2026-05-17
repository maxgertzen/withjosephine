/**
 * Defence-in-depth check on `photoR2Key` values read from Sanity. R2 treats
 * keys as opaque strings (no path-traversal escape semantics), but the backup
 * cron lets `photoR2Key` flow into a derived key path. The shape mirrors the
 * issuer's pattern in `src/lib/r2.ts`'s `buildPhotoKey` — anything else is
 * rejected as a per-asset failure.
 */

const PHOTO_KEY_PATTERN = /^submissions\/[a-zA-Z0-9-]+\/photo-/;

export function isValidPhotoR2Key(value: string): boolean {
  return PHOTO_KEY_PATTERN.test(value);
}
