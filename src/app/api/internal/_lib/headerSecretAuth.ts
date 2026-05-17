import { timingSafeStringEqual } from "@/lib/hmac";
import { DO_SECRET_HEADER } from "@/lib/http/headers";

export function isDispatchSecretAuthorized(request: Request): boolean {
  const expected = process.env.DO_DISPATCH_SECRET;
  if (!expected) return false;
  const provided = request.headers.get(DO_SECRET_HEADER);
  if (!provided) return false;
  return timingSafeStringEqual(provided, expected);
}
