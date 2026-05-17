import {
  CF_CONNECTING_IP_HEADER,
  X_FORWARDED_FOR_HEADER,
} from "@/lib/http/headers";

export function getClientIp(request: Request) {
  const cfIp = request.headers.get(CF_CONNECTING_IP_HEADER);
  if (cfIp) return cfIp;
  const xff = request.headers.get(X_FORWARDED_FOR_HEADER);
  if (xff) return xff.split(",")[0]?.trim() ?? null;
  return null;
}
