import { FIXTURE_SIDECAR_PORT, startFixtureSidecar } from "./fixtures-server";

async function main(): Promise<void> {
  const sidecar = await startFixtureSidecar();

  console.log(`[e2e-sidecar] listening on ${sidecar.url} (port ${FIXTURE_SIDECAR_PORT})`);
  process.on("SIGTERM", () => sidecar.stop().then(() => process.exit(0)));
  process.on("SIGINT", () => sidecar.stop().then(() => process.exit(0)));
}

void main();
