import { fileURLToPath } from "node:url";

/**
 * True when the file at `importMetaUrl` was invoked directly by Node/tsx as
 * the entry script (vs imported by another module). Lets a script export
 * helpers for tests AND auto-run when launched from the CLI.
 *
 *   if (isMainModule(import.meta.url)) await main();
 */
export function isMainModule(importMetaUrl: string): boolean {
  if (!process.argv[1]) return false;
  return process.argv[1] === fileURLToPath(importMetaUrl);
}
