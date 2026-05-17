// Standalone CLI entry that starts the fixture sidecar on the well-known
// FIXTURE_SIDECAR_PORT and keeps it alive. Used by Playwright's `webServer`
// array so the sidecar comes up alongside `pnpm dev` rather than after
// globalSetup (which runs too late — webServer is launched first).
import { FIXTURE_SIDECAR_PORT, startFixtureSidecar } from "./fixtures-server";

async function main(): Promise<void> {
  const sidecar = await startFixtureSidecar();
  // eslint-disable-next-line no-console
  console.log(`[e2e-sidecar] listening on ${sidecar.url} (port ${FIXTURE_SIDECAR_PORT})`);
  process.on("SIGTERM", () => sidecar.stop().then(() => process.exit(0)));
  process.on("SIGINT", () => sidecar.stop().then(() => process.exit(0)));
}

void main();
