export type LinkDestination = "reading" | "note" | "home" | "email" | "web" | "file";

export const EMAIL_FIRST_LINK_DESTINATIONS: ReadonlySet<LinkDestination> = new Set(["file", "web"]);

export type LinkTarget = {
  destination: LinkDestination;
  documentId?: string;
  email?: string;
  url?: string;
};

function fnv1aHex(text: string): string {
  let hash = 0x811c9dc5;
  for (let index = 0; index < text.length; index += 1) {
    hash ^= text.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(16).padStart(8, "0");
}

export function isHttpsAddress(value: string): boolean {
  try {
    return new URL(value.trim()).protocol === "https:";
  } catch {
    return false;
  }
}

function normalizeWebUrl(url: string): string | null {
  try {
    const parsed = new URL(url.trim());
    const path = parsed.pathname.replace(/\/+$/, "");
    return `${parsed.protocol}//${parsed.host}${path}${parsed.search}`;
  } catch {
    return null;
  }
}

export function linkKey(target: LinkTarget): string | null {
  switch (target.destination) {
    case "reading":
    case "note":
    case "file":
      return target.documentId ? `${target.destination}:${target.documentId}` : null;
    case "home":
      return "home";
    case "email": {
      const address = target.email?.trim().toLowerCase();
      return address ? `email:${fnv1aHex(address)}` : null;
    }
    case "web": {
      const normalized = target.url ? normalizeWebUrl(target.url) : null;
      return normalized ? `web:${fnv1aHex(normalized)}` : null;
    }
  }
}
