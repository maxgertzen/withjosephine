export const HEADLESS_UA_PATTERN =
  /headless|HeadlessChrome|Lighthouse|PhantomJS|Puppeteer|Playwright/i;

const CRAWLER_UA_PATTERN =
  /\bbot\b|bot[/;)-]|telegrambot|whatsapp\/|crawl|spider|slurp|facebookexternalhit|embedly|curl\/|wget\/|python-requests|go-http-client|axios\//i;

export function isAutomatedVisitor(userAgent: string | null): boolean {
  if (!userAgent) return true;
  return HEADLESS_UA_PATTERN.test(userAgent) || CRAWLER_UA_PATTERN.test(userAgent);
}
