export default async function globalTeardown(): Promise<void> {
  const sidecar = globalThis.__e2eSidecar;
  const msw = globalThis.__e2eMsw;
  if (msw) msw.close();
  if (sidecar) await sidecar.stop();
  globalThis.__e2eSidecar = undefined;
  globalThis.__e2eMsw = undefined;
  delete process.env.SANITY_API_HOST;
}
