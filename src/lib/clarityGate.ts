import { isPrivateLinkPath } from "@/lib/constants";

export function isClarityBlockedPath(pathname: string): boolean {
  return isPrivateLinkPath(pathname);
}
