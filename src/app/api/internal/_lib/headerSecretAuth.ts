import { timingSafeStringEqual } from "@/lib/hmac";

const SECRET_HEADER = "x-do-secret";

export function isDispatchSecretAuthorized(request: Request): boolean {
  const expected = process.env.DO_DISPATCH_SECRET;
  if (!expected) return false;
  const provided = request.headers.get(SECRET_HEADER);
  if (!provided) return false;
  return timingSafeStringEqual(provided, expected);
}
