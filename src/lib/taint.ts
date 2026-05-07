import { experimental_taintObjectReference } from "react";

/**
 * No-ops when React's RSC taint API isn't loaded (tests, client bundle).
 * In the RSC runtime the underlying function attaches a thrown-on-prop-pass
 * marker to the reference, so accidentally forwarding a server-only object
 * (a client carrying a secret, a raw query surface) into a Client Component
 * blows up loud at render time instead of silently leaking.
 */
export function taintServerObject(message: string, value: object) {
  if (typeof experimental_taintObjectReference === "function") {
    experimental_taintObjectReference(message, value);
  }
}
