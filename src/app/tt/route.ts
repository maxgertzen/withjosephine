import { NextResponse } from "next/server";

// Do NOT move this into `next.config.ts` redirects(): a config redirect whose
// `destination` carries a query string 500s on OpenNext/workerd in production
// (the query-less `/my-gifts` config redirect works; this one did not).
// `NextResponse.redirect` with a query-carrying URL is proven on prod.
export function GET(request: Request) {
  return NextResponse.redirect(
    new URL("/?utm_source=tiktok&utm_medium=bio", request.url),
    307,
  );
}
