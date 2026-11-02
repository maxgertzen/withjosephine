export function cookieValue(cookie: string, name: string): string | undefined {
  const prefix = `${name}=`;
  return cookie
    .split(";")
    .map((entry) => entry.trim())
    .find((entry) => entry.startsWith(prefix))
    ?.slice(prefix.length);
}

export function cookieFlagIsSet(cookie: string, name: string): boolean {
  return cookieValue(cookie, name) === "1";
}
