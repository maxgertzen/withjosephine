export function cookieFlagIsSet(cookie: string, name: string): boolean {
  return cookie.split(";").some((entry) => entry.trim() === `${name}=1`);
}
