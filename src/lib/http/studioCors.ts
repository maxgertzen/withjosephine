import { ADMIN_TOKEN_HEADER } from "./headers";

const HOSTED_STUDIO_ORIGIN = "https://withjosephine.sanity.studio";
const PREFLIGHT_MAX_AGE_SECONDS = "7200";

export function withStudioCors(response: Response): Response {
  response.headers.set("Access-Control-Allow-Origin", HOSTED_STUDIO_ORIGIN);
  return response;
}

export function studioRoute(
  label: string,
  handler: (request: Request) => Promise<Response>,
): (request: Request) => Promise<Response> {
  return async (request) => {
    try {
      return withStudioCors(await handler(request));
    } catch (error) {
      console.error(`[${label}] failed`, error);
      return withStudioCors(new Response(null, { status: 500 }));
    }
  };
}

export function studioPreflight(): Response {
  return withStudioCors(
    new Response(null, {
      status: 204,
      headers: {
        "Access-Control-Allow-Methods": "POST",
        "Access-Control-Allow-Headers": `content-type, ${ADMIN_TOKEN_HEADER}`,
        "Access-Control-Max-Age": PREFLIGHT_MAX_AGE_SECONDS,
      },
    }),
  );
}
