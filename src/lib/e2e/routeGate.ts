const ALLOWED_ENVIRONMENTS = new Set(["staging", "development"]);

export function isE2ERouteGateOpen(request: Request): boolean {
  if (process.env.E2E !== "1") return false;
  const environment = process.env.ENVIRONMENT ?? "development";
  if (!ALLOWED_ENVIRONMENTS.has(environment)) return false;
  const expected = process.env.E2E_RESET_TOKEN;
  if (!expected) return false;
  return request.headers.get("x-e2e-reset-token") === expected;
}
