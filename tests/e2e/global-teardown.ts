export default async function globalTeardown(): Promise<void> {
  const msw = globalThis.__e2eMsw;
  if (msw) msw.close();
  globalThis.__e2eMsw = undefined;
}
